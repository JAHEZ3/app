import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useOrderDetails } from "../hooks/useOrderDetails";
import {
    getDriverErrorMessage,
    useAssignDeliveryAgent,
    useOpenDeliveryAgents,
} from "../hooks/useDeliveryAgents";
import type { OpenDeliveryAgent } from "../repository/OrderRepository";

function DriverPickerScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const orderId = typeof id === "string" ? id : undefined;
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const { data: order, isLoading: orderLoading } = useOrderDetails(orderId);

    const dropLat = order?.delivery?.latitude;
    const dropLng = order?.delivery?.longitude;
    const city = order?.delivery?.city;

    // (0, 0) is the checkout placeholder when no GPS fix was captured.
    const hasValidCoords =
        typeof dropLat === "number" &&
        typeof dropLng === "number" &&
        (dropLat !== 0 || dropLng !== 0);

    // Always fetch all active agents — pass coords/city when available so the
    // backend can return distance info, but never block the fetch on having them.
    const {
        data: drivers,
        isLoading: driversLoading,
        isError,
        refetch,
        isRefetching,
    } = useOpenDeliveryAgents(
        {
            lat: hasValidCoords ? (dropLat as number) : undefined,
            lng: hasValidCoords ? (dropLng as number) : undefined,
            city: city ?? undefined,
        },
        !!orderId,
    );

    const assign = useAssignDeliveryAgent();
    const [pickingId, setPickingId] = useState<string | null>(null);
    const mapRef = useRef<MapView | null>(null);

    const sortedDrivers = useMemo(() => {
        if (!drivers) return [];
        return [...drivers].sort((a, b) => {
            // Primary: distance ascending (when backend provides it).
            const da = a.distanceKm ?? Infinity;
            const db = b.distanceKm ?? Infinity;
            if (da !== db) return da - db;
            // Secondary: rating descending.
            return (b.rating ?? 0) - (a.rating ?? 0);
        });
    }, [drivers]);

    const handlePick = useCallback(
        async (agent: OpenDeliveryAgent) => {
            if (!orderId) return;
            setPickingId(agent.id);
            try {
                await assign.mutateAsync({ orderId, deliveryAgentId: agent.id });
                router.replace({
                    pathname: "/orders/[id]",
                    params: { id: orderId },
                } as never);
            } catch (err) {
                const msg =
                    getDriverErrorMessage(err) ??
                    t("driver.assignErrorBody", { defaultValue: "Please try again." });
                Alert.alert(
                    t("driver.assignErrorTitle", {
                        defaultValue: "Could not assign driver",
                    }),
                    msg,
                );
            } finally {
                setPickingId(null);
            }
        },
        [assign, orderId, t],
    );

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/orders" as never);
    }, []);

    const renderDriver = useCallback(
        ({ item }: { item: OpenDeliveryAgent }) => {
            const isThisAssigning = pickingId === item.id;
            const disabled = assign.isPending && !isThisAssigning;
            return (
                <Animated.View entering={FadeInUp.duration(280)}>
                    <AnimatedPressable
                        onPress={() => handlePick(item)}
                        disabled={disabled || isThisAssigning}
                        haptic="impact"
                        scaleTo={0.98}
                        style={[styles.driverRow, isRTL && styles.rowReverse]}
                        accessibilityRole="button"
                    >
                        <View style={styles.avatar}>
                            {item.profileImageUrl ? (
                                <Image
                                    source={{ uri: item.profileImageUrl }}
                                    style={styles.avatarImg}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons name="person" size={22} color={colors.primary} />
                            )}
                        </View>
                        <View style={styles.driverText}>
                            <Text
                                style={[styles.driverName, { textAlign, writingDirection }]}
                                numberOfLines={1}
                            >
                                {item.name ??
                                    t("driver.unnamed", { defaultValue: "Driver" })}
                            </Text>
                            <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
                                {typeof item.distanceKm === "number" ? (
                                    <View style={[styles.metaPill, isRTL && styles.rowReverse]}>
                                        <Ionicons
                                            name="navigate-outline"
                                            size={11}
                                            color={colors.primary}
                                        />
                                        <Text style={[styles.metaText, { writingDirection }]}>
                                            {item.distanceKm.toFixed(1)} km
                                        </Text>
                                    </View>
                                ) : null}
                                {typeof item.estimatedMinutes === "number" ? (
                                    <View style={[styles.metaPill, isRTL && styles.rowReverse]}>
                                        <Ionicons
                                            name="time-outline"
                                            size={11}
                                            color={colors.primary}
                                        />
                                        <Text style={[styles.metaText, { writingDirection }]}>
                                            ~{item.estimatedMinutes} min
                                        </Text>
                                    </View>
                                ) : null}
                                {typeof item.rating === "number" ? (
                                    <View style={[styles.metaPill, isRTL && styles.rowReverse]}>
                                        <Ionicons name="star" size={11} color="#F5B400" />
                                        <Text style={[styles.metaText, { writingDirection }]}>
                                            {item.rating.toFixed(1)}
                                        </Text>
                                    </View>
                                ) : null}
                                {item.vehicleType ? (
                                    <View style={[styles.metaPill, isRTL && styles.rowReverse]}>
                                        <Ionicons
                                            name={
                                                item.vehicleType.toLowerCase().includes("car")
                                                    ? "car-outline"
                                                    : "bicycle-outline"
                                            }
                                            size={11}
                                            color={colors.outline}
                                        />
                                        <Text style={[styles.metaText, { writingDirection }]}>
                                            {item.vehicleType}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                        {isThisAssigning ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <View style={styles.pickIcon}>
                                <Ionicons
                                    name={isRTL ? "chevron-back" : "chevron-forward"}
                                    size={18}
                                    color={colors.primary}
                                />
                            </View>
                        )}
                    </AnimatedPressable>
                </Animated.View>
            );
        },
        [assign.isPending, handlePick, isRTL, pickingId, t, textAlign, writingDirection],
    );

    // ─── Map region — only shown when the order has real GPS coordinates ────
    const initialRegion = useMemo(() => {
        if (!hasValidCoords) return null;
        return {
            latitude: dropLat as number,
            longitude: dropLng as number,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
        };
    }, [hasValidCoords, dropLat, dropLng]);

    // ─── Body ───────────────────────────────────────────────────────────────
    let listBody: React.ReactNode;
    if (orderLoading || driversLoading) {
        listBody = (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.muted, { writingDirection }]}>
                    {t("driver.loading", { defaultValue: "Loading active drivers…" })}
                </Text>
            </View>
        );
    } else if (isError) {
        listBody = (
            <View style={styles.center}>
                <View style={styles.emptyIcon}>
                    <Ionicons
                        name="alert-circle-outline"
                        size={26}
                        color={colors.error}
                    />
                </View>
                <Text style={[styles.emptyTitle, { writingDirection }]}>
                    {t("driver.loadError", { defaultValue: "Could not load drivers." })}
                </Text>
                <AnimatedPressable
                    onPress={() => refetch()}
                    haptic="impact"
                    scaleTo={0.96}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                >
                    <Text style={[styles.retryBtnText, { writingDirection }]}>
                        {t("error.action", { defaultValue: "Retry" })}
                    </Text>
                </AnimatedPressable>
            </View>
        );
    } else if (sortedDrivers.length === 0) {
        listBody = (
            <View style={styles.center}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="moon-outline" size={26} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { writingDirection }]}>
                    {t("driver.emptyTitle", { defaultValue: "No drivers online" })}
                </Text>
                <Text style={[styles.emptyBody, { writingDirection }]}>
                    {t("driver.emptyBody", {
                        defaultValue:
                            "No drivers are available right now. We'll assign one as soon as someone is online.",
                    })}
                </Text>
                <AnimatedPressable
                    onPress={() => refetch()}
                    haptic="impact"
                    scaleTo={0.96}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                >
                    <Text style={[styles.retryBtnText, { writingDirection }]}>
                        {t("driver.refresh", { defaultValue: "Refresh" })}
                    </Text>
                </AnimatedPressable>
            </View>
        );
    } else {
        listBody = (
            <FlatList
                data={sortedDrivers}
                keyExtractor={(d) => d.id}
                renderItem={renderDriver}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 24 },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <View style={[styles.header, isRTL && styles.rowReverse]}>
                <AnimatedPressable
                    onPress={handleBack}
                    haptic="impact"
                    scaleTo={0.92}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel={t("accessibility.goBack", {
                        defaultValue: "Go back",
                    })}
                >
                    <Ionicons
                        name={isRTL ? "chevron-forward" : "chevron-back"}
                        size={22}
                        color={colors.onSurface}
                    />
                </AnimatedPressable>
                <View style={styles.headerTitleBlock}>
                    <Text style={[styles.headerEyebrow, { writingDirection }]}>
                        {t("header.eyebrow", { defaultValue: "Your activity" })}
                    </Text>
                    <Text style={[styles.headerTitle, { writingDirection }]}>
                        {t("driver.pickerTitle", { defaultValue: "Pick your driver" })}
                    </Text>
                </View>
                <View style={styles.iconButtonGhost} />
            </View>

            {/* Map with drop-off + driver pins */}
            {initialRegion ? (
                <Animated.View entering={FadeIn.duration(360)} style={styles.mapWrap}>
                    <MapView
                        ref={(r) => {
                            mapRef.current = r;
                        }}
                        provider={PROVIDER_DEFAULT}
                        style={StyleSheet.absoluteFill}
                        initialRegion={initialRegion}
                        showsCompass={false}
                        showsScale={false}
                        toolbarEnabled={false}
                    >
                        <Marker
                            coordinate={{
                                latitude: initialRegion.latitude,
                                longitude: initialRegion.longitude,
                            }}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={styles.dropPin}>
                                <Ionicons name="home" size={14} color={colors.onPrimary} />
                            </View>
                        </Marker>
                        {sortedDrivers
                            .filter(
                                (d) =>
                                    typeof (d as unknown as { lat?: number }).lat === "number" ||
                                    typeof (d as unknown as { latitude?: number }).latitude ===
                                        "number",
                            )
                            .map((d) => {
                                const lat =
                                    (d as unknown as { lat?: number; latitude?: number }).lat ??
                                    (d as unknown as { latitude?: number }).latitude;
                                const lng =
                                    (d as unknown as { lng?: number; longitude?: number }).lng ??
                                    (d as unknown as { longitude?: number }).longitude;
                                if (typeof lat !== "number" || typeof lng !== "number") return null;
                                return (
                                    <Marker
                                        key={d.id}
                                        coordinate={{ latitude: lat, longitude: lng }}
                                        anchor={{ x: 0.5, y: 0.5 }}
                                    >
                                        <View style={styles.driverPin}>
                                            <Ionicons
                                                name="bicycle"
                                                size={12}
                                                color={colors.onPrimary}
                                            />
                                        </View>
                                    </Marker>
                                );
                            })}
                    </MapView>
                </Animated.View>
            ) : null}

            <Text style={[styles.subtitle, { textAlign, writingDirection }]}>
                {t("driver.pickerSubtitle", {
                    defaultValue: sortedDrivers.length > 0
                        ? `${sortedDrivers.length} active driver${sortedDrivers.length === 1 ? "" : "s"} online — tap to assign`
                        : "All active delivery agents",
                })}
            </Text>

            <View style={styles.body}>{listBody}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    rowReverse: { flexDirection: "row-reverse" },
    header: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 6,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.soft,
    },
    iconButtonGhost: { width: 42, height: 42 },
    headerTitleBlock: {
        flex: 1,
        alignItems: "center",
    },
    headerEyebrow: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
        textAlign: "center",
    },
    headerTitle: {
        marginTop: 1,
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 23,
        textAlign: "center",
    },
    mapWrap: {
        marginHorizontal: screen.horizontal,
        height: 180,
        borderRadius: radii.xl,
        overflow: "hidden",
        backgroundColor: colors.surfaceContainer,
        ...shadows.card,
        ...(Platform.OS === "android" ? { elevation: 4 } : {}),
    },
    dropPin: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#0F7A36",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.onPrimary,
    },
    driverPin: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.onPrimary,
    },
    subtitle: {
        marginTop: 14,
        marginHorizontal: screen.horizontal,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 17,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceContainer,
    },
    body: { flex: 1 },
    listContent: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 10,
    },
    separator: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
    },
    driverRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 6,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarImg: { width: 48, height: 48 },
    driverText: {
        flex: 1,
        gap: 4,
    },
    driverName: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 19,
    },
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
    },
    metaPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceContainer,
    },
    metaText: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 10,
        lineHeight: 13,
    },
    pickIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        paddingVertical: 40,
        gap: 10,
    },
    muted: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 17,
        textAlign: "center",
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 22,
        textAlign: "center",
    },
    emptyBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
        textAlign: "center",
    },
    retryBtn: {
        marginTop: 10,
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
    },
    retryBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 13,
    },
});

export default DriverPickerScreen;
