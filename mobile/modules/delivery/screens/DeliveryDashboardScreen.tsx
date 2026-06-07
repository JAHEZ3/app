import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';
import { useGetDeliveryProfile } from '../hooks/useGetDeliveryProfile';
import { usePendingOrders } from '../hooks/usePendingOrders';
import { useAcceptOrder } from '../hooks/useAcceptOrder';
import { useRejectOrder } from '../hooks/useRejectOrder';
import { useActiveAssignment } from '../hooks/useActiveAssignment';
import { DashboardSkeleton } from '../components/SkeletonCard';
import type { PendingOrder } from '../types';
import { haversineMeters } from '@/modules/Order/tracking/useDeliveryTracking';

const ease = Easing.out(Easing.cubic);

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color = '#F55905', delay }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
    color?: string;
    delay: number;
}) {
    const opacity = useSharedValue(0);
    const y = useSharedValue(16);

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 450, easing: ease }));
        y.value = withDelay(delay, withTiming(0, { duration: 450, easing: ease }));
    }, [opacity, y, delay]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));

    return (
        <Animated.View style={[style, styles.statCard]}>
            <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Animated.View>
    );
}

// ─── Order card ──────────────────────────────────────────────────────────────

function OrderCard({
    order,
    agentCoords,
    onAccept,
    onReject,
    accepting,
    rejecting,
    isRTL,
    t,
}: {
    order: PendingOrder;
    agentCoords: { lat: number; lng: number } | null;
    onAccept: () => void;
    onReject: () => void;
    accepting: boolean;
    rejecting: boolean;
    isRTL: boolean;
    t: (key: string, opts?: object) => string;
}) {
    const [expanded, setExpanded] = useState(false);
    const dir = isRTL ? 'rtl' : 'ltr';

    const distanceKm = agentCoords && order.pickup
        ? (haversineMeters(agentCoords, order.pickup) / 1000).toFixed(1)
        : null;

    const callPhone = (phone: string) =>
        Linking.openURL(`tel:${phone}`).catch(() => undefined);

    return (
        <View style={styles.orderCard}>
            {/* Header row → opens the full premium order-details screen */}
            <TouchableOpacity
                onPress={() =>
                    router.navigate({
                        pathname: '/delivery/order/[id]',
                        params: { id: order.orderId },
                    } as never)
                }
                onLongPress={() => setExpanded((v) => !v)}
                activeOpacity={0.8}
                style={[styles.orderCardHeader, isRTL && styles.rowReverse]}
            >
                <View style={styles.restaurantIconWrap}>
                    <Ionicons name="restaurant" size={20} color="#F55905" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text
                        style={[styles.orderRestaurant, { writingDirection: dir }]}
                        numberOfLines={1}
                    >
                        {order.restaurantName || t('orders.unknownRestaurant')}
                    </Text>
                    {order.orderNumber ? (
                        <Text style={[styles.orderNumber, { writingDirection: dir }]}>
                            #{order.orderNumber}
                        </Text>
                    ) : null}
                </View>
                <View style={[styles.orderMetaRight, isRTL && styles.rowReverse]}>
                    {distanceKm ? (
                        <View style={[styles.distancePill, isRTL && styles.rowReverse]}>
                            <Ionicons name="location" size={11} color="#F55905" />
                            <Text style={styles.distanceText}>{distanceKm} km</Text>
                        </View>
                    ) : null}
                    <Ionicons
                        name={isRTL ? 'chevron-back' : 'chevron-forward'}
                        size={16}
                        color="#aaa"
                    />
                </View>
            </TouchableOpacity>

            {/* Summary row (always visible) */}
            <View style={[styles.orderSummary, isRTL && styles.rowReverse]}>
                {order.total != null ? (
                    <View style={[styles.summaryChip, isRTL && styles.rowReverse]}>
                        <Ionicons name="cash-outline" size={13} color="#1a7a4a" />
                        <Text style={[styles.summaryChipText, { color: '#1a7a4a' }]}>
                            {t('orders.totalILS', { amount: order.total.toFixed(2) })}
                        </Text>
                    </View>
                ) : null}
                {order.itemsCount != null ? (
                    <View style={[styles.summaryChip, isRTL && styles.rowReverse]}>
                        <Ionicons name="bag-handle-outline" size={13} color="#555" />
                        <Text style={[styles.summaryChipText, { color: '#555' }]}>
                            {t('orders.itemsCount', { count: order.itemsCount })}
                        </Text>
                    </View>
                ) : null}
                {/* Customer location preview — visible even when collapsed */}
                {order.dropoff ? (
                    <View style={[styles.summaryChip, isRTL && styles.rowReverse]}>
                        <Ionicons name="location-outline" size={13} color="#2E7D32" />
                        <Text style={[styles.summaryChipText, { color: '#2E7D32' }]} numberOfLines={1}>
                            {order.dropoff.address
                                ? order.dropoff.address.split(',')[0]
                                : `${order.dropoff.lat.toFixed(4)}, ${order.dropoff.lng.toFixed(4)}`}
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Expanded details */}
            {expanded ? (
                <View style={styles.orderDetails}>
                    {/* Pickup */}
                    {order.pickup ? (
                        <View style={[styles.detailRow, isRTL && styles.rowReverse]}>
                            <View style={[styles.detailIcon, { backgroundColor: '#FFF5F0' }]}>
                                <Ionicons name="restaurant" size={15} color="#F55905" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { writingDirection: dir }]}>
                                    {t('orders.pickup')}
                                </Text>
                                <Text style={[styles.detailValue, { writingDirection: dir }]} numberOfLines={2}>
                                    {order.pickup.address || `${order.pickup.lat.toFixed(5)}, ${order.pickup.lng.toFixed(5)}`}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!order.pickup) return;
                                    Linking.openURL(
                                        `geo:0,0?q=${order.pickup.lat},${order.pickup.lng}`,
                                    ).catch(() => undefined);
                                }}
                                style={styles.mapBtn}
                            >
                                <Ionicons name="map-outline" size={16} color="#F55905" />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Dropoff — customer's pinned location from checkout */}
                    {order.dropoff ? (
                        <View style={[styles.detailRow, isRTL && styles.rowReverse]}>
                            <View style={[styles.detailIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="home" size={15} color="#2E7D32" />
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={[styles.detailLabel, { writingDirection: dir }]}>
                                    {t('orders.dropoff')}
                                </Text>
                                {order.dropoff.address ? (
                                    <Text style={[styles.detailValue, { writingDirection: dir }]} numberOfLines={2}>
                                        {order.dropoff.address}
                                    </Text>
                                ) : null}
                                {/* Always show the raw coordinates so the agent
                                    can verify the pin even when the address text
                                    is absent or ambiguous. */}
                                <View style={[styles.coordChip, isRTL && styles.rowReverse]}>
                                    <Ionicons name="navigate-outline" size={11} color="#2E7D32" />
                                    <Text style={styles.coordText}>
                                        {order.dropoff.lat.toFixed(5)}, {order.dropoff.lng.toFixed(5)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!order.dropoff) return;
                                    const { lat, lng } = order.dropoff;
                                    Linking.openURL(
                                        `geo:${lat},${lng}?q=${lat},${lng}`,
                                    ).catch(() => undefined);
                                }}
                                style={styles.mapBtn}
                            >
                                <Ionicons name="map-outline" size={16} color="#2E7D32" />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Customer contact */}
                    {order.customerName || order.customerPhone ? (
                        <View style={[styles.detailRow, isRTL && styles.rowReverse]}>
                            <View style={[styles.detailIcon, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="person" size={15} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { writingDirection: dir }]}>
                                    {t('orders.customer')}
                                </Text>
                                {order.customerName ? (
                                    <Text style={[styles.detailValue, { writingDirection: dir }]}>
                                        {order.customerName}
                                    </Text>
                                ) : null}
                            </View>
                            {order.customerPhone ? (
                                <TouchableOpacity
                                    onPress={() => callPhone(order.customerPhone!)}
                                    style={styles.callBtn}
                                >
                                    <Ionicons name="call" size={15} color="#fff" />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ) : null}

                    {/* Restaurant contact */}
                    {order.restaurantPhone ? (
                        <View style={[styles.detailRow, isRTL && styles.rowReverse]}>
                            <View style={[styles.detailIcon, { backgroundColor: '#FFF5F0' }]}>
                                <Ionicons name="business" size={15} color="#F55905" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { writingDirection: dir }]}>
                                    {t('orders.restaurant')}
                                </Text>
                                <Text style={[styles.detailValue, { writingDirection: dir }]}>
                                    {order.restaurantName}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => callPhone(order.restaurantPhone!)}
                                style={styles.callBtn}
                            >
                                <Ionicons name="call" size={15} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Notes */}
                    {order.notes ? (
                        <View style={[styles.detailRow, isRTL && styles.rowReverse]}>
                            <View style={[styles.detailIcon, { backgroundColor: '#FFFBEB' }]}>
                                <Ionicons name="document-text" size={15} color="#D97706" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { writingDirection: dir }]}>
                                    {t('orders.notes')}
                                </Text>
                                <Text style={[styles.detailValue, { writingDirection: dir }]}>
                                    {order.notes}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </View>
            ) : null}

            {/* Accept + Reject — laid out side-by-side. Reject is the
                lower-emphasis outline button on the leading side, Accept is
                the primary filled button on the trailing side. */}
            <View style={[styles.actionsRow, isRTL && styles.actionsRowRtl]}>
                <TouchableOpacity
                    onPress={onReject}
                    disabled={accepting || rejecting}
                    style={[
                        styles.rejectBtn,
                        (accepting || rejecting) && { opacity: 0.7 },
                    ]}
                    activeOpacity={0.82}
                >
                    {rejecting ? (
                        <ActivityIndicator size="small" color="#F55905" />
                    ) : (
                        <>
                            <Ionicons name="close-circle" size={18} color="#F55905" />
                            <Text style={styles.rejectBtnText}>
                                {t('orders.reject', { defaultValue: 'Reject' })}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onAccept}
                    disabled={accepting || rejecting}
                    style={[
                        styles.acceptBtn,
                        styles.acceptBtnHalf,
                        (accepting || rejecting) && { opacity: 0.7 },
                    ]}
                    activeOpacity={0.82}
                >
                    {accepting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.acceptBtnText}>{t('orders.accept')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DeliveryDashboardScreen() {
    const { t } = useDeliveryT();
    const isRTL = useRTL();
    const dir = isRTL ? 'rtl' : 'ltr';

    const { data: profile, isLoading, refetch: refetchProfile, isRefetching } = useGetDeliveryProfile();
    const { data: pendingOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = usePendingOrders();
    const { data: activeAssignment } = useActiveAssignment();
    const { mutate: acceptOrder, isPending: isAccepting, variables: acceptingId } = useAcceptOrder();
    const { mutate: rejectOrder, isPending: isRejecting, variables: rejectingVars } = useRejectOrder();

    const headerOpacity = useSharedValue(0);
    const headerY = useSharedValue(-10);

    useEffect(() => {
        headerOpacity.value = withTiming(1, { duration: 500, easing: ease });
        headerY.value = withTiming(0, { duration: 500, easing: ease });
    }, [headerOpacity, headerY]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: headerY.value }],
    }));

    const handleRefresh = () => {
        refetchProfile();
        refetchOrders();
    };

    if (isLoading) return <DashboardSkeleton />;
    if (!profile) return null;

    const emptyValue = t('dashboard.fields.empty');
    const ratingStars = Math.round(profile.rating ?? 0);
    const vehicleLabel = profile.vehicleType
        ? t(`application.vehicles.${profile.vehicleType === 'on_foot' ? 'onFoot' : profile.vehicleType}` as const)
        : emptyValue;

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#F55905" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={handleRefresh}
                        tintColor="#F55905"
                    />
                }
            >
                {/* Header gradient */}
                <LinearGradient
                    colors={['#F55905', '#c94400']}
                    style={{ paddingTop: 20, paddingBottom: 48, paddingHorizontal: 20 }}
                >
                    <Animated.View style={[headerStyle, {
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 24,
                    }]}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, color: '#fff' }}>
                            {t('dashboard.title')}
                        </Text>
                    </Animated.View>

                    {/* Profile card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            {profile.profilePictureUrl ? (
                                <Image
                                    source={{ uri: profile.profilePictureUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    transition={300}
                                />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="person" size={40} color="#c0c0c0" />
                                </View>
                            )}
                        </View>

                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 20, color: '#1E1E1E', textAlign: 'center' }}>
                            {profile.fullName}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Ionicons key={i} name={i < ratingStars ? 'star' : 'star-outline'} size={16} color="#F55905" />
                            ))}
                            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#767777', marginLeft: 4 }}>
                                {(profile.rating ?? 0).toFixed(1)}
                            </Text>
                        </View>

                        <View style={[styles.activeBadge, isRTL && styles.rowReverse]}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeBadgeText}>{t('dashboard.activeAgent')}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 20, paddingTop: 48 }}>

                    {/* Stats */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        <StatCard icon="bicycle-outline" label={t('dashboard.stats.deliveries')} value={profile.totalDeliveries ?? 0} delay={200} />
                        <StatCard icon="wallet-outline" label={t('dashboard.stats.balance')} value={`ILS ${(profile.walletBalance ?? 0).toFixed(0)}`} color="#1a7a4a" delay={280} />
                        <StatCard icon="star-outline" label={t('dashboard.stats.rating')} value={(profile.rating ?? 0).toFixed(1)} color="#c94400" delay={360} />
                    </View>

                    {/* Active assignment shortcut */}
                    {activeAssignment ? (
                        <TouchableOpacity
                            onPress={() => router.navigate('/delivery/tabs/tracking' as never)}
                            style={styles.activeOrderBanner}
                            activeOpacity={0.85}
                        >
                            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }]}>
                                <View style={styles.activeOrderIcon}>
                                    <Ionicons name="navigate" size={20} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.activeOrderTitle, { writingDirection: dir }]}>
                                        {t('orders.activeOrderTitle')}
                                    </Text>
                                    <Text style={[styles.activeOrderSub, { writingDirection: dir }]} numberOfLines={1}>
                                        {activeAssignment.restaurantName ?? activeAssignment.orderNumber ?? ''}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#fff" />
                        </TouchableOpacity>
                    ) : null}

                    {/* Available orders */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { writingDirection: dir }]}>
                            {t('orders.availableTitle')}
                        </Text>
                        {ordersLoading ? (
                            <ActivityIndicator size="small" color="#F55905" />
                        ) : (
                            <Text style={styles.orderCount}>
                                {pendingOrders.length}
                            </Text>
                        )}
                    </View>

                    {!ordersLoading && pendingOrders.length === 0 ? (
                        <View style={styles.emptyOrders}>
                            <Ionicons name="bag-outline" size={36} color="#d0d0d0" />
                            <Text style={[styles.emptyOrdersText, { writingDirection: dir }]}>
                                {t('orders.noAvailable')}
                            </Text>
                        </View>
                    ) : (
                        pendingOrders.map((order) => (
                            <OrderCard
                                key={order.orderId}
                                order={order}
                                agentCoords={null}
                                onAccept={() =>
                                    acceptOrder(order.orderId, {
                                        onSuccess: () =>
                                            router.navigate('/delivery/tabs/tracking' as never),
                                    })
                                }
                                onReject={() => rejectOrder({ orderId: order.orderId })}
                                accepting={isAccepting && acceptingId === order.orderId}
                                rejecting={isRejecting && rejectingVars?.orderId === order.orderId}
                                isRTL={isRTL}
                                t={t as unknown as (key: string, opts?: object) => string}
                            />
                        ))
                    )}

                    {/* Profile details */}
                    <View style={styles.card}>
                        <Text style={[styles.cardTitle, { writingDirection: dir }]}>
                            {t('dashboard.profileDetails')}
                        </Text>
                        <InfoRow icon="phone-portrait-outline" label={t('dashboard.fields.phone')} value={profile.phone || emptyValue} isRTL={isRTL} />
                        <InfoRow icon="location-outline" label={t('dashboard.fields.city')} value={profile.city || emptyValue} isRTL={isRTL} />
                        <InfoRow icon="car-outline" label={t('dashboard.fields.vehicle')} value={vehicleLabel} isRTL={isRTL} />
                        <InfoRow icon="card-outline" label={t('dashboard.fields.nationalId')} value={profile.idNumber || emptyValue} isRTL={isRTL} />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value, isRTL }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    isRTL: boolean;
}) {
    const dir = isRTL ? 'rtl' : 'ltr';
    return (
        <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
            <View style={styles.infoIcon}>
                <Ionicons name={icon} size={17} color="#F55905" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { writingDirection: dir }]}>{label}</Text>
                <Text style={[styles.infoValue, { writingDirection: dir }]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F7F7' },
    rowReverse: { flexDirection: 'row-reverse' },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 10,
        marginBottom: -32,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        overflow: 'hidden',
        backgroundColor: '#F7F7F7',
        borderWidth: 3,
        borderColor: '#F55905',
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8F5E9',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32' },
    activeBadgeText: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#2E7D32' },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontFamily: 'Cairo_700Bold', fontSize: 20, color: '#1E1E1E' },
    statLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#767777', textAlign: 'center' },
    activeOrderBanner: {
        backgroundColor: '#F55905',
        borderRadius: 18,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#F55905',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 6,
    },
    activeOrderIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeOrderTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' },
    activeOrderSub: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E' },
    orderCount: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 13,
        color: '#fff',
        backgroundColor: '#F55905',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        overflow: 'hidden',
    },
    emptyOrders: {
        alignItems: 'center',
        paddingVertical: 28,
        gap: 10,
        backgroundColor: '#fff',
        borderRadius: 18,
        marginBottom: 20,
    },
    emptyOrdersText: {
        fontFamily: 'Tajawal_400Regular',
        fontSize: 13,
        color: '#aaa',
        textAlign: 'center',
    },
    // Order card
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    orderCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
    },
    restaurantIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orderRestaurant: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E1E1E' },
    orderNumber: { fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#aaa', marginTop: 1 },
    orderMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    distancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFF5F0',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    distanceText: { fontFamily: 'Tajawal_500Medium', fontSize: 11, color: '#F55905' },
    orderSummary: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexWrap: 'wrap',
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F7F7F7',
        borderRadius: 10,
        paddingHorizontal: 9,
        paddingVertical: 4,
    },
    summaryChipText: { fontFamily: 'Tajawal_500Medium', fontSize: 12 },
    // Expanded details
    orderDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        gap: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    detailLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 11, color: '#aaa', marginBottom: 1 },
    detailValue: { fontFamily: 'Tajawal_500Medium', fontSize: 13, color: '#1E1E1E', lineHeight: 18 },
    coordChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E8F5E9',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    coordText: {
        fontFamily: 'Tajawal_400Regular',
        fontSize: 10,
        color: '#2E7D32',
        letterSpacing: 0.2,
    },
    mapBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F7F7F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    callBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F55905',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    acceptBtn: {
        margin: 14,
        marginTop: 10,
        backgroundColor: '#F55905',
        borderRadius: 14,
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#F55905',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    acceptBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#fff' },
    // Accept + Reject buttons share a row. Each takes half the width minus
    // the row's gap; `acceptBtnHalf` overrides the default `margin: 14`
    // so the buttons can sit flush in their `actionsRow` container.
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 14,
        marginTop: 10,
    },
    actionsRowRtl: { flexDirection: 'row-reverse' },
    acceptBtnHalf: {
        flex: 1,
        margin: 0,
        marginTop: 0,
    },
    rejectBtn: {
        flex: 1,
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#F55905',
        backgroundColor: '#FFF5F0',
    },
    rejectBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#F55905' },
    // Profile card
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E1E1E', marginBottom: 4 },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoLabel: { fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#767777', marginBottom: 1 },
    infoValue: { fontFamily: 'Tajawal_500Medium', fontSize: 14, color: '#1E1E1E' },
});
