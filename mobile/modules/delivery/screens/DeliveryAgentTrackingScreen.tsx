import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Appearance,
    Linking,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import AnimatedDriverMarker from '@/modules/Order/tracking/AnimatedDriverMarker';
import {
    DARK_THEME,
    LIGHT_THEME,
} from '@/modules/Order/tracking/mapStyles';
import {
    estimateEtaMinutes,
    haversineMeters,
} from '@/modules/Order/tracking/useDeliveryTracking';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { radii, shadows, typography } from '@/components/ui/theme';
import { router } from 'expo-router';
import { useActiveAssignment } from '../hooks/useActiveAssignment';
import { useUpdateDeliveryStatus } from '../hooks/useUpdateDeliveryStatus';
import { deliverySocketService } from '@/socket/socket.service';

const BROADCAST_THROTTLE_MS = 5_000;

function DeliveryAgentTrackingScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const writingDirection = isRTL ? 'rtl' : 'ltr';
    const systemScheme = useColorScheme() ?? Appearance.getColorScheme() ?? 'light';
    const theme = systemScheme === 'dark' ? DARK_THEME : LIGHT_THEME;

    const { data: assignment, isLoading, refetch, isRefetching, isError } = useActiveAssignment();
    const updateStatus = useUpdateDeliveryStatus();

    const advanceStatus = useCallback(
        (next: 'out_for_delivery' | 'delivered') => {
            if (!assignment?.orderId || updateStatus.isPending) return; // duplicate guard
            const isDeliver = next === 'delivered';
            Alert.alert(
                isDeliver
                    ? t('actions.confirmDeliveredTitle', { defaultValue: 'Mark as delivered?' })
                    : t('actions.confirmStartTitle', { defaultValue: 'Start delivery?' }),
                isDeliver
                    ? t('actions.confirmDeliveredBody', { defaultValue: 'This finalizes the order. It cannot be undone.' })
                    : t('actions.confirmStartBody', { defaultValue: 'The customer will see that you are on the way.' }),
                [
                    { text: t('actions.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
                    {
                        text: isDeliver
                            ? t('actions.delivered', { defaultValue: 'Delivered' })
                            : t('actions.startDelivery', { defaultValue: 'Start Delivery' }),
                        onPress: () =>
                            updateStatus.mutate(
                                { orderId: assignment.orderId, status: next },
                                {
                                    onError: () =>
                                        Alert.alert(
                                            t('actions.errorTitle', { defaultValue: 'Could not update' }),
                                            t('actions.errorBody', { defaultValue: 'Please try again.' }),
                                        ),
                                },
                            ),
                    },
                ],
            );
        },
        [assignment?.orderId, updateStatus, t],
    );

    const [agentCoords, setAgentCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const lastBroadcastRef = useRef<number>(0);
    const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
    const [bearing, setBearing] = useState(0);

    // ── GPS subscription ────────────────────────────────────────────────────
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        let cancelled = false;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (!cancelled) setPermissionDenied(true);
                return;
            }
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 5,
                    timeInterval: 3_000,
                },
                (loc) => {
                    if (cancelled) return;
                    const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
                    const prev = prevCoordsRef.current;
                    if (prev) {
                        const dx = next.lng - prev.lng;
                        const dy = next.lat - prev.lat;
                        if (Math.abs(dx) + Math.abs(dy) > 1e-7) {
                            const b = (Math.atan2(dx, dy) * 180) / Math.PI;
                            setBearing((b + 360) % 360);
                        }
                    }
                    prevCoordsRef.current = next;
                    setAgentCoords(next);
                },
            );
        })();

        return () => {
            cancelled = true;
            subscription?.remove();
        };
    }, []);

    // ── Broadcast to the gateway when an order is active ────────────────────
    useEffect(() => {
        if (!agentCoords || !assignment?.orderId) return;
        const now = Date.now();
        if (now - lastBroadcastRef.current < BROADCAST_THROTTLE_MS) return;
        lastBroadcastRef.current = now;
        deliverySocketService.emit('delivery:location', {
            orderId: assignment.orderId,
            agentId: undefined,
            lat: agentCoords.lat,
            lng: agentCoords.lng,
            timestamp: now,
        });
    }, [agentCoords, assignment?.orderId]);

    // ── Derived map values ──────────────────────────────────────────────────
    const dropoff = assignment?.dropoff ?? null;
    const pickup = assignment?.pickup ?? null;

    const etaMinutes = useMemo(
        () => estimateEtaMinutes(agentCoords, dropoff),
        [agentCoords, dropoff],
    );
    const distanceKm = useMemo(() => {
        if (!agentCoords || !dropoff) return null;
        return haversineMeters(agentCoords, dropoff) / 1000;
    }, [agentCoords, dropoff]);

    const mapRef = useRef<MapView | null>(null);
    const [didAutoFit, setDidAutoFit] = useState(false);

    const fitToRoute = useCallback(() => {
        if (!mapRef.current) return;
        const points: { latitude: number; longitude: number }[] = [];
        if (agentCoords) points.push({ latitude: agentCoords.lat, longitude: agentCoords.lng });
        if (pickup) points.push({ latitude: pickup.lat, longitude: pickup.lng });
        if (dropoff) points.push({ latitude: dropoff.lat, longitude: dropoff.lng });
        if (points.length === 0) return;
        if (points.length === 1) {
            mapRef.current.animateCamera({ center: points[0], zoom: 15 }, { duration: 500 });
            return;
        }
        mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 140, bottom: 280, left: 60, right: 60 },
            animated: true,
        });
    }, [agentCoords, pickup, dropoff]);

    useEffect(() => {
        if (didAutoFit) return;
        if (agentCoords && (pickup || dropoff)) {
            fitToRoute();
            setDidAutoFit(true);
        }
    }, [agentCoords, pickup, dropoff, didAutoFit, fitToRoute]);

    // Use the order's pickup as the stable initial camera position so the map
    // doesn't jump when GPS first arrives. Agent position animates in via
    // fitToRoute once we have real coords.
    const initialRegion = useMemo(() => {
        const center = pickup ?? dropoff ?? { lat: 31.5017, lng: 34.4668 };
        return {
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const routeLine = useMemo(() => {
        const pts: { latitude: number; longitude: number }[] = [];
        if (agentCoords) pts.push({ latitude: agentCoords.lat, longitude: agentCoords.lng });
        if (pickup) pts.push({ latitude: pickup.lat, longitude: pickup.lng });
        if (dropoff) pts.push({ latitude: dropoff.lat, longitude: dropoff.lng });
        return pts.length >= 2 ? pts : null;
    }, [agentCoords, pickup, dropoff]);

    const openExternalNav = useCallback(() => {
        const target = pickup ?? dropoff;
        if (!target) return;
        const url = Platform.select({
            ios: `maps:0,0?q=${target.lat},${target.lng}`,
            android: `geo:0,0?q=${target.lat},${target.lng}`,
            default: `https://maps.google.com/?q=${target.lat},${target.lng}`,
        }) as string;
        Linking.openURL(url).catch(() => undefined);
    }, [pickup, dropoff]);

    const callCustomer = useCallback(() => {
        if (!assignment?.customerPhone) return;
        Linking.openURL(`tel:${assignment.customerPhone}`).catch(() => undefined);
    }, [assignment?.customerPhone]);

    // ── Render ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: theme.surface }]} edges={['top']}>
                <ActivityIndicator size="large" color="#F55905" style={{ marginTop: 80 }} />
            </SafeAreaView>
        );
    }

    if (!assignment) {
        return (
            <SafeAreaView style={[styles.safe, { backgroundColor: theme.surface }]} edges={['top']}>
                <View style={styles.emptyWrap}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Ionicons name="navigate-circle-outline" size={48} color="#F55905" />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.onSurface, writingDirection }]}>
                        {t('tracking.noAssignmentTitle')}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: theme.outline, writingDirection }]}>
                        {isError ? t('tracking.fetchError') : t('tracking.noAssignmentSubtitle')}
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        disabled={isRefetching}
                        style={styles.emptyBtn}
                    >
                        <Text style={styles.emptyBtnText}>
                            {isRefetching ? t('tracking.refreshing') : t('tracking.refresh')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.safe, { backgroundColor: theme.surface }]}>
            <StatusBar
                barStyle={theme.isDark ? 'light-content' : 'dark-content'}
                translucent
                backgroundColor="transparent"
            />

            <MapView
                ref={(ref) => {
                    mapRef.current = ref;
                }}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                customMapStyle={theme.mapStyle}
                showsCompass={false}
                showsMyLocationButton={false}
                showsPointsOfInterest={false}
                toolbarEnabled={false}
                rotateEnabled
            >
                {pickup ? (
                    <Marker
                        coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
                        anchor={{ x: 0.5, y: 1 }}
                        tracksViewChanges={false}
                    >
                        <View style={styles.pinWrap}>
                            <View style={[styles.pin, { backgroundColor: '#F55905', borderColor: '#fff' }]}>
                                <Ionicons name="restaurant" size={16} color="#fff" />
                            </View>
                            <View style={[styles.pinTip, { borderTopColor: '#F55905' }]} />
                        </View>
                    </Marker>
                ) : null}

                {dropoff ? (
                    <Marker
                        coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
                        anchor={{ x: 0.5, y: 1 }}
                        tracksViewChanges={false}
                    >
                        <View style={styles.pinWrap}>
                            <View style={[styles.pin, { backgroundColor: theme.card, borderColor: theme.destinationStroke }]}>
                                <Ionicons name="home" size={16} color={theme.destinationStroke} />
                            </View>
                            <View style={[styles.pinTip, { borderTopColor: theme.destinationStroke }]} />
                        </View>
                    </Marker>
                ) : null}

                {routeLine ? (
                    <Polyline
                        coordinates={routeLine}
                        strokeColor={theme.routeStroke}
                        strokeWidth={4}
                        lineDashPattern={[8, 6]}
                    />
                ) : null}

                {agentCoords ? (
                    <AnimatedDriverMarker
                        coord={{ lat: agentCoords.lat, lng: agentCoords.lng }}
                        bearing={bearing}
                    />
                ) : null}
            </MapView>

            {/* Header */}
            <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.headerSafe}>
                <View style={[styles.header, isRTL && styles.rowReverse]}>
                    <View style={[styles.headerTitleWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text
                            style={[styles.headerTitle, { color: theme.onSurface, writingDirection }]}
                            numberOfLines={1}
                        >
                            {t('tracking.title')}
                        </Text>
                        {assignment.orderNumber ? (
                            <Text
                                style={[styles.headerSubtitle, { color: theme.outline, writingDirection }]}
                                numberOfLines={1}
                            >
                                #{assignment.orderNumber}
                            </Text>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        onPress={fitToRoute}
                        style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                        accessibilityLabel={t('tracking.recenter')}
                    >
                        <Ionicons name="locate" size={20} color={theme.onSurface} />
                    </TouchableOpacity>
                </View>
                <LinearGradient
                    pointerEvents="none"
                    colors={[
                        theme.isDark ? 'rgba(15,15,17,0.32)' : 'rgba(255,255,255,0.32)',
                        'transparent',
                    ]}
                    style={styles.topFade}
                />
            </SafeAreaView>

            {permissionDenied ? (
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={[styles.banner, { top: insets.top + 76 }]}
                >
                    <View style={[styles.bannerBubble, { backgroundColor: '#B91C1C' }]}>
                        <Ionicons name="alert-circle" size={16} color="#fff" />
                        <Text style={styles.bannerText} numberOfLines={2}>
                            {t('tracking.permissionDenied')}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}

            {/* Bottom action card */}
            <Animated.View
                entering={FadeInDown.duration(360)}
                style={[styles.bottomSheet, { paddingBottom: 110 + Math.max(insets.bottom, 0) }]}
                pointerEvents="box-none"
            >
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={[styles.cardTitle, { color: theme.onSurface, writingDirection }]}
                                numberOfLines={1}
                            >
                                {assignment.customerName || t('tracking.customer')}
                            </Text>
                            <Text
                                style={[styles.cardSubtitle, { color: theme.outline, writingDirection }]}
                                numberOfLines={1}
                            >
                                {assignment.restaurantName || t('tracking.restaurant')}
                            </Text>
                        </View>
                        <View style={[styles.etaPill, { backgroundColor: theme.liveBg }]}>
                            <Text style={[styles.etaText, { color: theme.liveText }]}>
                                {etaMinutes != null
                                    ? t('tracking.etaMinutes', { count: etaMinutes })
                                    : t('tracking.etaUnknown')}
                            </Text>
                        </View>
                    </View>

                    {distanceKm != null ? (
                        <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
                            <Ionicons name="map-outline" size={14} color={theme.outline} />
                            <Text style={[styles.metaText, { color: theme.outline, writingDirection }]}>
                                {t('tracking.distance', { km: distanceKm.toFixed(1) })}
                            </Text>
                        </View>
                    ) : null}

                    <View style={[styles.actions, isRTL && styles.rowReverse]}>
                        <TouchableOpacity
                            onPress={openExternalNav}
                            style={[styles.actionBtn, styles.actionPrimary]}
                        >
                            <Ionicons name="navigate" size={16} color="#fff" />
                            <Text style={styles.actionPrimaryText}>{t('tracking.navigate')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={callCustomer}
                            disabled={!assignment.customerPhone}
                            style={[
                                styles.actionBtn,
                                styles.actionSecondary,
                                { borderColor: theme.border, opacity: assignment.customerPhone ? 1 : 0.5 },
                            ]}
                        >
                            <Ionicons name="call" size={16} color={theme.onSurface} />
                            <Text style={[styles.actionSecondaryText, { color: theme.onSurface }]}>
                                {t('tracking.call')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Lifecycle action — Start Delivery (ready for pickup) /
                        Delivered (on the way). Start is gated on the restaurant
                        having marked the food ready so the backend transition
                        (ready_for_pickup → out_for_delivery) succeeds. */}
                    {assignment.status === 'ACCEPTED' && assignment.rawStatus === 'ready_for_pickup' ? (
                        <TouchableOpacity
                            onPress={() => advanceStatus('out_for_delivery')}
                            disabled={updateStatus.isPending}
                            style={[styles.lifecycleBtn, { backgroundColor: '#F55905' }, updateStatus.isPending && { opacity: 0.7 }]}
                        >
                            {updateStatus.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="bicycle" size={18} color="#fff" />
                                    <Text style={styles.lifecycleBtnText}>
                                        {t('actions.startDelivery', { defaultValue: 'Start Delivery' })}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : null}
                    {assignment.status === 'ON_THE_WAY' ? (
                        <TouchableOpacity
                            onPress={() => advanceStatus('delivered')}
                            disabled={updateStatus.isPending}
                            style={[styles.lifecycleBtn, { backgroundColor: '#1a7a4a' }, updateStatus.isPending && { opacity: 0.7 }]}
                        >
                            {updateStatus.isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                                    <Text style={styles.lifecycleBtnText}>
                                        {t('actions.delivered', { defaultValue: 'Delivered' })}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                        onPress={() =>
                            router.navigate({
                                pathname: '/delivery/order/[id]',
                                params: { id: assignment.orderId },
                            } as never)
                        }
                        style={styles.detailsLink}
                    >
                        <Ionicons name="receipt-outline" size={15} color={theme.outline} />
                        <Text style={[styles.detailsLinkText, { color: theme.outline }]}>
                            {t('actions.viewDetails', { defaultValue: 'View order details' })}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    rowReverse: { flexDirection: 'row-reverse' },
    headerSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
    topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, zIndex: -1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        ...shadows.soft,
    },
    headerTitleWrap: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        ...shadows.soft,
    },
    headerTitle: { fontFamily: typography.headlineSemi, fontSize: 13, lineHeight: 17 },
    headerSubtitle: { marginTop: 1, fontFamily: typography.bodyBold, fontSize: 10, lineHeight: 13, letterSpacing: 0.4 },
    banner: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
    bannerBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
    },
    bannerText: { color: '#fff', fontFamily: typography.bodyMedium, fontSize: 12, flexShrink: 1 },
    bottomSheet: { position: 'absolute', left: 14, right: 14, bottom: 0 },
    card: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        gap: 12,
        ...shadows.card,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardTitle: { fontFamily: typography.headlineSemi, fontSize: 15, lineHeight: 19 },
    cardSubtitle: { marginTop: 2, fontFamily: typography.bodyMedium, fontSize: 12, lineHeight: 16 },
    etaPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
    etaText: { fontFamily: typography.headlineSemi, fontSize: 12 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: typography.bodyMedium, fontSize: 12 },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: radii.pill,
    },
    actionPrimary: { backgroundColor: '#F55905' },
    actionPrimaryText: { color: '#fff', fontFamily: typography.headlineSemi, fontSize: 13 },
    actionSecondary: { backgroundColor: 'transparent', borderWidth: 1 },
    actionSecondaryText: { fontFamily: typography.headlineSemi, fontSize: 13 },
    lifecycleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        borderRadius: radii.pill,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    lifecycleBtnText: { color: '#fff', fontFamily: typography.headlineSemi, fontSize: 15 },
    detailsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
    detailsLinkText: { fontFamily: typography.bodyMedium, fontSize: 12 },
    pinWrap: { alignItems: 'center' },
    pin: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        ...shadows.soft,
    },
    pinTip: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 4,
    },
    emptyTitle: { fontFamily: typography.headlineSemi, fontSize: 17, textAlign: 'center' },
    emptySubtitle: { fontFamily: typography.bodyMedium, fontSize: 13, lineHeight: 18, textAlign: 'center' },
    emptyBtn: {
        backgroundColor: '#F55905',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: radii.pill,
        marginTop: 4,
    },
    emptyBtnText: { color: '#fff', fontFamily: typography.headlineSemi, fontSize: 13 },
});

export default DeliveryAgentTrackingScreen;
