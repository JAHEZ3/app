import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Appearance,
    StatusBar,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { radii, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useOrderDetails } from "../hooks/useOrderDetails";
import {
    estimateEtaMinutes,
    haversineMeters,
    useDeliveryTracking,
} from "../tracking/useDeliveryTracking";
import AnimatedDriverMarker from "../tracking/AnimatedDriverMarker";
import DriverInfoCard from "../tracking/DriverInfoCard";
import { DARK_THEME, LIGHT_THEME } from "../tracking/mapStyles";

const TRACKABLE_STATUSES = new Set(["ON_THE_WAY", "OUT_FOR_DELIVERY", "PREPARING"]);

function DeliveryTrackingScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const orderId = typeof id === "string" ? id : undefined;
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const systemScheme = useColorScheme() ?? Appearance.getColorScheme() ?? "light";
    const theme = systemScheme === "dark" ? DARK_THEME : LIGHT_THEME;

    const { data: order, isLoading, isError, refetch } = useOrderDetails(orderId);

    const destination = useMemo(() => {
        const d = order?.delivery;
        if (!d?.latitude || !d?.longitude) return null;
        if (d.latitude === 0 && d.longitude === 0) return null;
        return { lat: d.latitude, lng: d.longitude };
    }, [order?.delivery]);

    // Snapshot of driver position included in OrderDetails (when present) is
    // the starting point — live updates replace it.
    const initialDriverCoords = useMemo(() => {
        const d = order?.delivery;
        if (!d?.latitude || !d?.longitude) return null;
        if (d.latitude === 0 && d.longitude === 0) return null;
        return null; // delivery.latitude in OrderDetails is the *drop-off*, not the driver
    }, [order?.delivery]);

    const trackingEnabled = !!order && TRACKABLE_STATUSES.has(order.status);

    const {
        coords: driverCoords,
        isLive,
        isStale,
    } = useDeliveryTracking({
        orderId,
        initialCoords: initialDriverCoords,
        enabled: trackingEnabled,
    });

    const etaMinutes = useMemo(
        () => estimateEtaMinutes(driverCoords, destination),
        [driverCoords, destination],
    );
    const distanceKm = useMemo(() => {
        if (!driverCoords || !destination) return null;
        return haversineMeters(driverCoords, destination) / 1000;
    }, [driverCoords, destination]);

    // Map ref + camera control
    const mapRef = useRef<MapView | null>(null);
    const [didAutoFit, setDidAutoFit] = useState(false);
    const [followDriver, setFollowDriver] = useState(true);

    const fitToRoute = useCallback(() => {
        if (!mapRef.current) return;
        const points: { latitude: number; longitude: number }[] = [];
        if (driverCoords) {
            points.push({ latitude: driverCoords.lat, longitude: driverCoords.lng });
        }
        if (destination) {
            points.push({ latitude: destination.lat, longitude: destination.lng });
        }
        if (points.length === 0) return;
        if (points.length === 1) {
            mapRef.current.animateCamera(
                { center: points[0], zoom: 16 },
                { duration: 600 },
            );
            return;
        }
        mapRef.current.fitToCoordinates(points, {
            edgePadding: {
                top: 120,
                bottom: 280,
                left: 60,
                right: 60,
            },
            animated: true,
        });
    }, [driverCoords, destination]);

    // Fit once when we have both points the first time.
    useEffect(() => {
        if (didAutoFit) return;
        if (driverCoords && destination) {
            fitToRoute();
            setDidAutoFit(true);
        }
    }, [driverCoords, destination, didAutoFit, fitToRoute]);

    // Follow-the-driver mode: re-center on every server update.
    useEffect(() => {
        if (!followDriver || !mapRef.current || !driverCoords) return;
        mapRef.current.animateCamera(
            {
                center: { latitude: driverCoords.lat, longitude: driverCoords.lng },
            },
            { duration: 700 },
        );
    }, [driverCoords, followDriver]);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/orders" as never);
    }, []);

    const handleRecenter = useCallback(() => {
        setFollowDriver(false);
        setDidAutoFit(true);
        fitToRoute();
    }, [fitToRoute]);

    const initialRegion = useMemo(() => {
        const center =
            driverCoords ?? destination ?? { lat: 31.5017, lng: 34.4668 }; // Gaza fallback
        return {
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
        };
    }, [driverCoords, destination]);

    const statusLabel = order?.status
        ? t(
              `status.${
                  order.status === "ON_THE_WAY" || order.status === "OUT_FOR_DELIVERY"
                      ? "onTheWay"
                      : order.status === "PREPARING"
                      ? "preparing"
                      : "pending"
              }`,
              { defaultValue: order.status },
          )
        : "";

    const routeLine = useMemo(() => {
        if (!driverCoords || !destination) return null;
        return [
            { latitude: driverCoords.lat, longitude: driverCoords.lng },
            { latitude: destination.lat, longitude: destination.lng },
        ];
    }, [driverCoords, destination]);

    // ── Render ────────────────────────────────────────────────────────────

    if (!orderId) {
        return (
            <SafeAreaView
                style={[styles.safe, { backgroundColor: theme.surface }]}
                edges={["top"]}
            >
                <StatusBar
                    barStyle={theme.isDark ? "light-content" : "dark-content"}
                />
                <View style={styles.fullCenter}>
                    <Text style={[styles.errorTitle, { color: theme.onSurface }]}>
                        {t("error.missingId", {
                            defaultValue: "We couldn't find this order.",
                        })}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (isLoading && !order) {
        return (
            <SafeAreaView
                style={[styles.safe, { backgroundColor: theme.surface }]}
                edges={["top"]}
            >
                <StatusBar
                    barStyle={theme.isDark ? "light-content" : "dark-content"}
                />
                <View style={styles.fullCenter}>
                    <ActivityIndicator size="large" color="#F55905" />
                </View>
            </SafeAreaView>
        );
    }

    if (isError || !order) {
        return (
            <SafeAreaView
                style={[styles.safe, { backgroundColor: theme.surface }]}
                edges={["top"]}
            >
                <StatusBar
                    barStyle={theme.isDark ? "light-content" : "dark-content"}
                />
                <View style={styles.fullCenter}>
                    <Text style={[styles.errorTitle, { color: theme.onSurface }]}>
                        {t("error.title", {
                            defaultValue: "Could not load order",
                        })}
                    </Text>
                    <AnimatedPressable
                        onPress={() => refetch()}
                        haptic="impact"
                        scaleTo={0.96}
                        style={styles.retryBtn}
                        accessibilityRole="button"
                    >
                        <Text style={styles.retryBtnText}>
                            {t("error.action", { defaultValue: "Retry" })}
                        </Text>
                    </AnimatedPressable>
                </View>
            </SafeAreaView>
        );
    }

    const noDriverYet = !driverCoords;

    return (
        <View style={[styles.safe, { backgroundColor: theme.surface }]}>
            <StatusBar
                barStyle={theme.isDark ? "light-content" : "dark-content"}
                translucent
                backgroundColor="transparent"
            />

            {/* Map */}
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
                onPanDrag={() => {
                    if (followDriver) setFollowDriver(false);
                }}
            >
                {destination ? (
                    <Marker
                        coordinate={{
                            latitude: destination.lat,
                            longitude: destination.lng,
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                        tracksViewChanges={false}
                    >
                        <View style={styles.destPinWrap}>
                            <View
                                style={[
                                    styles.destPin,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: theme.destinationStroke,
                                    },
                                ]}
                            >
                                <Ionicons
                                    name="home"
                                    size={16}
                                    color={theme.destinationStroke}
                                />
                            </View>
                            <View
                                style={[
                                    styles.destPinTip,
                                    { borderTopColor: theme.destinationStroke },
                                ]}
                            />
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

                {driverCoords ? (
                    <AnimatedDriverMarker
                        coord={{ lat: driverCoords.lat, lng: driverCoords.lng }}
                        bearing={driverCoords.bearing}
                        stale={isStale}
                    />
                ) : null}
            </MapView>

            {/* Header overlay */}
            <SafeAreaView pointerEvents="box-none" edges={["top"]} style={styles.headerSafe}>
                <View style={[styles.header, isRTL && styles.rowReverse]}>
                    <AnimatedPressable
                        onPress={handleBack}
                        haptic="impact"
                        scaleTo={0.92}
                        style={[
                            styles.iconBtn,
                            { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t("accessibility.goBack", {
                            defaultValue: "Go back",
                        })}
                    >
                        <Ionicons
                            name={isRTL ? "chevron-forward" : "chevron-back"}
                            size={22}
                            color={theme.onSurface}
                        />
                    </AnimatedPressable>

                    <View
                        style={[
                            styles.headerTitleWrap,
                            { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                    >
                        <Text
                            style={[
                                styles.headerTitle,
                                { color: theme.onSurface, writingDirection },
                            ]}
                            numberOfLines={1}
                        >
                            {t("tracking.title", { defaultValue: "Live tracking" })}
                        </Text>
                        {order.orderNumber ? (
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { color: theme.outline, writingDirection },
                                ]}
                                numberOfLines={1}
                            >
                                #{order.orderNumber}
                            </Text>
                        ) : null}
                    </View>

                    <AnimatedPressable
                        onPress={handleRecenter}
                        haptic="impact"
                        scaleTo={0.92}
                        style={[
                            styles.iconBtn,
                            { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t("tracking.recenter", {
                            defaultValue: "Recenter map",
                        })}
                    >
                        <Ionicons name="locate" size={20} color={theme.onSurface} />
                    </AnimatedPressable>
                </View>

                {/* Top fade so the map stays readable behind the header */}
                <LinearGradient
                    pointerEvents="none"
                    colors={[
                        theme.isDark ? "rgba(15,15,17,0.32)" : "rgba(255,255,255,0.32)",
                        "transparent",
                    ]}
                    style={styles.topFade}
                />
            </SafeAreaView>

            {/* Waiting-for-driver banner */}
            {noDriverYet ? (
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={[
                        styles.waitingBanner,
                        { top: insets.top + 72 },
                    ]}
                >
                    <View
                        style={[
                            styles.waitingBubble,
                            { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                    >
                        <ActivityIndicator size="small" color="#F55905" />
                        <Text
                            style={[
                                styles.waitingText,
                                { color: theme.onSurface, writingDirection },
                            ]}
                        >
                            {t("tracking.waiting", {
                                defaultValue: "Waiting for the driver to start sharing location…",
                            })}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}

            {/* Bottom sheet */}
            <Animated.View
                entering={FadeInDown.duration(360)}
                style={[
                    styles.bottomSheet,
                    { paddingBottom: 18 + Math.max(insets.bottom, 0) },
                ]}
                pointerEvents="box-none"
            >
                <DriverInfoCard
                    theme={theme}
                    name={order.delivery?.courierName}
                    phone={order.delivery?.courierPhone}
                    etaMinutes={etaMinutes}
                    distanceKm={distanceKm}
                    isLive={isLive}
                    statusLabel={statusLabel}
                    callLabel={t("tracking.call", { defaultValue: "Call driver" })}
                    messageLabel={t("tracking.message", {
                        defaultValue: "Message driver",
                    })}
                    etaLabelTemplate={t("tracking.etaMinutes", {
                        defaultValue: "~ {{count}} min",
                    })}
                    etaUnknown={t("tracking.etaUnknown", {
                        defaultValue: "ETA pending…",
                    })}
                    distanceLabelTemplate={t("tracking.distance", {
                        defaultValue: "{{km}} away",
                    })}
                    liveLabel={t("realtime.live", { defaultValue: "Live" })}
                    offlineLabel={t("realtime.offline", { defaultValue: "Offline" })}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    fullCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 30,
    },
    errorTitle: {
        fontFamily: typography.headlineSemi,
        fontSize: 16,
        lineHeight: 21,
        textAlign: "center",
    },
    retryBtn: {
        minHeight: 46,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
        backgroundColor: "#F55905",
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
    retryBtnText: {
        fontFamily: typography.headlineSemi,
        color: "#FFFFFF",
        fontSize: 14,
        lineHeight: 18,
    },
    headerSafe: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
    topFade: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        zIndex: -1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        ...shadows.soft,
    },
    headerTitleWrap: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        ...shadows.soft,
    },
    headerTitle: {
        fontFamily: typography.headlineSemi,
        fontSize: 13,
        lineHeight: 17,
    },
    headerSubtitle: {
        marginTop: 1,
        fontFamily: typography.bodyBold,
        fontSize: 10,
        lineHeight: 13,
        letterSpacing: 0.4,
    },
    waitingBanner: {
        position: "absolute",
        left: 16,
        right: 16,
        alignItems: "center",
    },
    waitingBubble: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.pill,
        borderWidth: 1,
        ...shadows.soft,
    },
    waitingText: {
        fontFamily: typography.bodyMedium,
        fontSize: 12,
        lineHeight: 16,
        flexShrink: 1,
    },
    bottomSheet: {
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 0,
    },
    destPinWrap: {
        alignItems: "center",
    },
    destPin: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        ...shadows.soft,
    },
    destPinTip: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
});

export default DeliveryTrackingScreen;
