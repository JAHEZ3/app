import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useCartT, useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import OrderStatusBadge from "../components/OrderStatusBadge";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import OrderItemRow from "../components/OrderItemRow";
import OrderDetailsSkeleton from "../components/OrderDetailsSkeleton";
import OrderStateBanner from "../components/OrderStateBanner";
import PaymentInfoCard from "../components/PaymentInfoCard";
import PaymentProofCard from "../components/PaymentProofCard";
import RatingDialog from "../components/RatingDialog";
import { getOrdersErrorMessage } from "../hooks/useOrders";
import { useOrderDetails } from "../hooks/useOrderDetails";
import { useOrderReceipt } from "../hooks/useOrderReceipt";
import { useJoinOrderRoom, useSocketStatus } from "@/hooks/useSocket";

const formatPrice = (value: number, currency: string) =>
    `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const formatDateTime = (iso: string | undefined, locale: string) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    try {
        return date.toLocaleString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return date.toLocaleString();
    }
};

const paymentMethodIcon = (method?: string): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap => {
    switch (method) {
        case "cash_on_delivery":
            return "cash-outline";
        case "card":
            return "card-outline";
        case "online":
            return "wallet-outline";
        default:
            return "card-outline";
    }
};

function Section({
    icon,
    title,
    children,
    delay = 0,
}: {
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
    title: string;
    children: React.ReactNode;
    delay?: number;
}) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <Animated.View
            entering={FadeInUp.delay(delay).duration(360)}
            style={styles.section}
        >
            <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
                <View style={styles.sectionIcon}>
                    <Ionicons name={icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { writingDirection }]}>
                    {title}
                </Text>
            </View>
            <View style={styles.sectionBody}>{children}</View>
        </Animated.View>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
    label: string;
    value: string;
}) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    return (
        <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
            <View style={styles.infoIcon}>
                <Ionicons name={icon} size={16} color={colors.primary} />
            </View>
            <View style={styles.infoBody}>
                <Text style={[styles.infoLabel, { textAlign, writingDirection }]}>
                    {label}
                </Text>
                <Text
                    style={[styles.infoValue, { textAlign, writingDirection }]}
                    numberOfLines={3}
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}

function StateBlock({
    icon,
    title,
    body,
    actionLabel,
    onAction,
    destructive = false,
}: {
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
    destructive?: boolean;
}) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <Animated.View entering={FadeIn.duration(360)} style={styles.stateWrap}>
            <View style={styles.stateIllustration}>
                <LinearGradient
                    colors={
                        destructive
                            ? ["#FFE2DC", "#FFD0C5"]
                            : ["#FFE9D8", "#FFD2B5"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.stateOrb}
                />
                <View style={styles.stateIconCircle}>
                    <Ionicons
                        name={icon}
                        size={36}
                        color={destructive ? colors.error : colors.primary}
                    />
                </View>
            </View>
            <Text style={[styles.stateTitle, { writingDirection }]}>{title}</Text>
            <Text style={[styles.stateBody, { writingDirection }]}>{body}</Text>
            {actionLabel && onAction ? (
                <AnimatedPressable
                    onPress={onAction}
                    haptic="impact"
                    scaleTo={0.96}
                    style={[styles.stateButton, isRTL && styles.rowReverse]}
                    accessibilityRole="button"
                >
                    <Text style={[styles.stateButtonText, { writingDirection }]}>
                        {actionLabel}
                    </Text>
                    <Ionicons
                        name={isRTL ? "arrow-back" : "arrow-forward"}
                        size={16}
                        color={colors.onPrimary}
                    />
                </AnimatedPressable>
            ) : null}
        </Animated.View>
    );
}

function OrderDetailsScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const orderId = typeof id === "string" ? id : undefined;
    const { t } = useOrdersT();
    const { t: tCart } = useCartT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const language = useLanguageStore((s) => s.language);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";
    const currency = tCart("price.currency");

    const {
        data: order,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    } = useOrderDetails(orderId);

    const { openReceipt, isLoading: isOpeningReceipt } = useOrderReceipt();
    const [showFullId, setShowFullId] = useState(false);
    const [ratingOpen, setRatingOpen] = useState(false);
    // The order details endpoint doesn't echo the rating back, so we track a
    // successful submit locally to flip the UI from "rate" to "rated".
    const [justRated, setJustRated] = useState(false);
    const socketStatus = useSocketStatus();
    const isLive = socketStatus === "open";

    // Join the per-order room while this screen is mounted. The service
    // auto-rejoins after a reconnect, so we don't need to babysit it.
    useJoinOrderRoom(orderId);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace("/orders" as never);
    }, []);

    const placedAt = useMemo(
        () => formatDateTime(order?.createdAt, language === "ar" ? "ar" : "en-GB"),
        [order?.createdAt, language],
    );

    const deliveryAddress = useMemo(() => {
        const d = order?.delivery;
        if (!d) return null;
        const parts = [d.street, d.city].filter(Boolean);
        if (parts.length) return parts.join(", ");
        if (d.addressLine) return d.addressLine;
        if (d.address) return d.address;
        return null;
    }, [order?.delivery]);

    const handleOpenReceipt = useCallback(async () => {
        if (!orderId) return;
        const result = await openReceipt(orderId);
        if (result.ok) return;
        if (result.reason === "not_ready") {
            Alert.alert(
                t("receipt.notReadyTitle"),
                t("receipt.notReadyBody"),
            );
            return;
        }
        Alert.alert(
            t("receipt.errorTitle"),
            result.message ?? t("receipt.errorBody"),
        );
    }, [openReceipt, orderId, t]);

    let content: React.ReactNode;

    if (!orderId) {
        content = (
            <StateBlock
                icon="alert-circle-outline"
                title={t("error.title", { defaultValue: "Could not load order" })}
                body={t("error.missingId", {
                    defaultValue: "We couldn't find this order.",
                })}
                actionLabel={t("error.back", { defaultValue: "Go back" })}
                onAction={handleBack}
                destructive
            />
        );
    } else if (isLoading && !order) {
        content = (
            <ScrollView
                contentContainerStyle={{ paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
            >
                <OrderDetailsSkeleton />
            </ScrollView>
        );
    } else if (isError && !order) {
        content = (
            <StateBlock
                icon="alert-circle-outline"
                title={t("error.title", { defaultValue: "Could not load order" })}
                body={
                    getOrdersErrorMessage(error) ??
                    error?.message ??
                    t("error.body", { defaultValue: "Please try again." })
                }
                actionLabel={t("error.action", { defaultValue: "Retry" })}
                onAction={() => refetch()}
                destructive
            />
        );
    } else if (!order) {
        content = (
            <StateBlock
                icon="receipt-outline"
                title={t("error.title")}
                body={t("error.body")}
                actionLabel={t("error.action")}
                onAction={() => refetch()}
            />
        );
    } else {
        const subtotal = order.subtotal ?? 0;
        const deliveryFee = order.deliveryFee ?? 0;
        const discount = order.discount ?? 0;
        const total = order.total ?? subtotal + deliveryFee - discount;
        const orderRef = order.orderNumber || order.orderId;
        const orderRefDisplay = showFullId
            ? orderRef
            : `${orderRef.slice(0, 10).toUpperCase()}${orderRef.length > 10 ? "…" : ""}`;
        const paymentLabel = order.paymentMethod
            ? t(`payment.${order.paymentMethod}`, {
                  defaultValue: order.paymentMethod,
              })
            : null;
        const paymentStatusLabel = order.paymentStatus
            ? t(`paymentStatus.${order.paymentStatus}`, {
                  defaultValue: order.paymentStatus,
              })
            : null;
        const isPaid = order.paymentStatus === "paid";

        content = (
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: 30 + Math.max(insets.bottom, 0) },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={() => refetch()}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                        progressBackgroundColor={colors.card}
                    />
                }
            >
                {/* Hero */}
                <Animated.View entering={FadeInUp.duration(360)} style={styles.heroCard}>
                    <View style={[styles.heroTopRow, isRTL && styles.rowReverse]}>
                        <View style={styles.heroIcon}>
                            <Ionicons name="storefront" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.heroTitleBlock}>
                            <Text
                                style={[styles.heroEyebrow, { textAlign, writingDirection }]}
                                numberOfLines={1}
                            >
                                {t("details.title")}
                            </Text>
                            {order.restaurantName ? (
                                <Text
                                    style={[styles.heroTitle, { textAlign, writingDirection }]}
                                    numberOfLines={1}
                                >
                                    {order.restaurantName}
                                </Text>
                            ) : null}
                            <AnimatedPressable
                                onPress={() => setShowFullId((v) => !v)}
                                haptic="selection"
                                scaleTo={0.97}
                                style={[styles.refRow, isRTL && styles.rowReverse]}
                                accessibilityRole="button"
                                accessibilityLabel={t("details.copyId", {
                                    defaultValue: "Show full order ID",
                                })}
                            >
                                <Ionicons
                                    name="pricetag-outline"
                                    size={11}
                                    color={colors.outline}
                                />
                                <Text
                                    style={[styles.refText, { writingDirection }]}
                                    numberOfLines={1}
                                >
                                    #{orderRefDisplay}
                                </Text>
                            </AnimatedPressable>
                        </View>
                    </View>

                    <View style={[styles.heroMeta, isRTL && styles.rowReverse]}>
                        <OrderStatusBadge status={order.status} />
                        {placedAt ? (
                            <Text
                                style={[styles.heroMetaText, { textAlign, writingDirection }]}
                                numberOfLines={1}
                            >
                                {placedAt}
                            </Text>
                        ) : null}
                        <View
                            style={[
                                styles.livePill,
                                isLive ? styles.livePillOn : styles.livePillOff,
                            ]}
                        >
                            <View
                                style={[
                                    styles.liveDot,
                                    isLive ? styles.liveDotOn : styles.liveDotOff,
                                ]}
                            />
                            <Text
                                style={[
                                    styles.liveText,
                                    isLive ? styles.liveTextOn : styles.liveTextOff,
                                    { writingDirection },
                                ]}
                            >
                                {isLive
                                    ? t("realtime.live", { defaultValue: "Live" })
                                    : t("realtime.offline", { defaultValue: "Offline" })}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Status banner — surfaces waiting / accepted / ready / rejected */}
                {(() => {
                    const variant: "waiting" | "accepted" | "ready" | "rejected" | null =
                        order.status === "PENDING"
                            ? "waiting"
                            : order.status === "CONFIRMED" || order.status === "PREPARING"
                              ? "accepted"
                              : order.status === "READY_FOR_PICKUP"
                                ? "ready"
                                : order.status === "CANCELLED"
                                  ? "rejected"
                                  : null;
                    if (!variant) return null;
                    return (
                        <Animated.View entering={FadeInUp.duration(360)}>
                            <OrderStateBanner variant={variant} />
                        </Animated.View>
                    );
                })()}

                {/* Status timeline */}
                <Section
                    icon="time-outline"
                    title={t("sections.history", { defaultValue: "Status" })}
                    delay={60}
                >
                    <OrderStatusTimeline
                        history={order.statusHistory ?? []}
                        currentStatus={order.status}
                    />
                </Section>

                {/* Delivery */}
                <Section
                    icon="bicycle-outline"
                    title={t("sections.delivery", { defaultValue: "Delivery info" })}
                    delay={110}
                >
                    {/* Driver acceptance flow — three mutually-exclusive states:
                          1. acceptance === "pending"     → "Waiting for driver"
                          2. no courier + assignable stage → "Pick a driver"
                          3. (default)                    → nothing here, the
                             "Track delivery live" card below takes over once
                             the driver actually moves. */}
                    {order.deliveryAcceptance === "pending" ? (
                        <View
                            style={[
                                styles.waitingDriverCard,
                                isRTL && styles.rowReverse,
                            ]}
                        >
                            <ActivityIndicator size="small" color={colors.primary} />
                            <View style={styles.trackTextBlock}>
                                <Text
                                    style={[styles.pickDriverTitle, { writingDirection }]}
                                >
                                    {t("tracking.waitingDriver", {
                                        defaultValue: "Waiting for the driver to accept…",
                                    })}
                                </Text>
                                <Text
                                    style={[styles.pickDriverBody, { writingDirection }]}
                                    numberOfLines={2}
                                >
                                    {t("tracking.waitingDriverBody", {
                                        defaultValue:
                                            "We've sent your request. If the driver declines, you'll be able to pick another.",
                                    })}
                                </Text>
                            </View>
                        </View>
                    ) : !order.delivery?.courierName &&
                      ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(
                          order.status,
                      ) ? (
                        <AnimatedPressable
                            onPress={() =>
                                router.push({
                                    pathname: "/orders/[id]/pick-driver",
                                    params: { id: order.orderId },
                                } as never)
                            }
                            haptic="impact"
                            scaleTo={0.97}
                            style={[
                                styles.pickDriverBtn,
                                isRTL && styles.rowReverse,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={t("tracking.pickDriver", {
                                defaultValue: "Pick a driver",
                            })}
                        >
                            <View style={styles.pickDriverIcon}>
                                <Ionicons
                                    name="people-outline"
                                    size={16}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.trackTextBlock}>
                                <Text
                                    style={[styles.pickDriverTitle, { writingDirection }]}
                                >
                                    {t("tracking.pickDriver", {
                                        defaultValue: "Pick a driver",
                                    })}
                                </Text>
                                <Text
                                    style={[styles.pickDriverBody, { writingDirection }]}
                                    numberOfLines={1}
                                >
                                    {t("tracking.pickDriverBody", {
                                        defaultValue: "Choose an available driver on the map",
                                    })}
                                </Text>
                            </View>
                            <Ionicons
                                name={isRTL ? "chevron-back" : "chevron-forward"}
                                size={18}
                                color={colors.primary}
                            />
                        </AnimatedPressable>
                    ) : null}

                    {["OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "PREPARING"].includes(
                        order.status,
                    ) ? (
                        <AnimatedPressable
                            onPress={() =>
                                router.push({
                                    pathname: "/orders/[id]/track",
                                    params: { id: order.orderId },
                                } as never)
                            }
                            haptic="impact"
                            scaleTo={0.97}
                            style={[
                                styles.trackBtn,
                                isRTL && styles.rowReverse,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={t("tracking.openTracking", {
                                defaultValue: "Track delivery live",
                            })}
                        >
                            <View style={styles.trackIcon}>
                                <Ionicons
                                    name="navigate"
                                    size={16}
                                    color={colors.onPrimary}
                                />
                            </View>
                            <View style={styles.trackTextBlock}>
                                <Text
                                    style={[styles.trackTitle, { writingDirection }]}
                                >
                                    {t("tracking.openTracking", {
                                        defaultValue: "Track delivery live",
                                    })}
                                </Text>
                                <Text
                                    style={[styles.trackBody, { writingDirection }]}
                                    numberOfLines={1}
                                >
                                    {t("tracking.openTrackingBody", {
                                        defaultValue: "See the driver on the map",
                                    })}
                                </Text>
                            </View>
                            <Ionicons
                                name={isRTL ? "chevron-back" : "chevron-forward"}
                                size={18}
                                color={colors.onPrimary}
                            />
                        </AnimatedPressable>
                    ) : null}
                    {deliveryAddress ? (
                        <InfoRow
                            icon="location-outline"
                            label={t("delivery.address", {
                                defaultValue: "Address",
                            })}
                            value={deliveryAddress}
                        />
                    ) : null}
                    {order.delivery?.notes ? (
                        <InfoRow
                            icon="information-circle-outline"
                            label={t("delivery.notes", {
                                defaultValue: "Notes",
                            })}
                            value={order.delivery.notes}
                        />
                    ) : null}
                    {order.delivery?.contactName ||
                    order.delivery?.contactPhone ? (
                        <InfoRow
                            icon="person-outline"
                            label={t("delivery.contact", {
                                defaultValue: "Contact",
                            })}
                            value={[
                                order.delivery.contactName,
                                order.delivery.contactPhone,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        />
                    ) : null}
                    {order.delivery?.courierName ||
                    order.delivery?.courierPhone ? (
                        <InfoRow
                            icon="bicycle-outline"
                            label={t("delivery.courier", {
                                defaultValue: "Courier",
                            })}
                            value={[
                                order.delivery.courierName,
                                order.delivery.courierPhone,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        />
                    ) : null}
                    {order.delivery?.estimatedArrival ? (
                        <InfoRow
                            icon="time-outline"
                            label={t("delivery.eta", {
                                defaultValue: "Estimated arrival",
                            })}
                            value={
                                formatDateTime(
                                    order.delivery.estimatedArrival,
                                    language === "ar" ? "ar" : "en-GB",
                                ) ?? order.delivery.estimatedArrival
                            }
                        />
                    ) : null}
                    {order.delivery?.deliveredAt ? (
                        <InfoRow
                            icon="checkmark-circle-outline"
                            label={t("delivery.deliveredAt", {
                                defaultValue: "Delivered at",
                            })}
                            value={
                                formatDateTime(
                                    order.delivery.deliveredAt,
                                    language === "ar" ? "ar" : "en-GB",
                                ) ?? order.delivery.deliveredAt
                            }
                        />
                    ) : null}
                    {!deliveryAddress &&
                    !order.delivery?.notes &&
                    !order.delivery?.contactName &&
                    !order.delivery?.contactPhone &&
                    !order.delivery?.courierName &&
                    !order.delivery?.courierPhone &&
                    !order.delivery?.estimatedArrival &&
                    !order.delivery?.deliveredAt ? (
                        <Text
                            style={[styles.emptyText, { textAlign, writingDirection }]}
                        >
                            {t("delivery.empty", {
                                defaultValue: "No delivery details available yet.",
                            })}
                        </Text>
                    ) : null}
                </Section>

                {/* Items */}
                <Section
                    icon="fast-food-outline"
                    title={t("sections.items", { defaultValue: "Items" })}
                    delay={160}
                >
                    {order.items.length === 0 ? (
                        <Text
                            style={[styles.emptyText, { textAlign, writingDirection }]}
                        >
                            {t("sections.itemsEmpty", {
                                defaultValue: "No items in this order.",
                            })}
                        </Text>
                    ) : (
                        <View style={styles.itemsList}>
                            {order.items.map((item, index) => (
                                <React.Fragment key={`${item.mealId}-${index}`}>
                                    {index > 0 ? (
                                        <View style={styles.itemDivider} />
                                    ) : null}
                                    <OrderItemRow item={item} />
                                </React.Fragment>
                            ))}
                        </View>
                    )}

                    <View style={styles.summaryDivider} />

                    <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
                        <Text
                            style={[styles.summaryLabel, { textAlign, writingDirection }]}
                        >
                            {t("details.subtotal")}
                        </Text>
                        <Text
                            style={[styles.summaryValue, { textAlign, writingDirection }]}
                        >
                            {formatPrice(subtotal, currency)}
                        </Text>
                    </View>
                    <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
                        <Text
                            style={[styles.summaryLabel, { textAlign, writingDirection }]}
                        >
                            {t("details.deliveryFee")}
                        </Text>
                        <Text
                            style={[styles.summaryValue, { textAlign, writingDirection }]}
                        >
                            {formatPrice(deliveryFee, currency)}
                        </Text>
                    </View>
                    {discount > 0 ? (
                        <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
                            <Text
                                style={[
                                    styles.summaryLabel,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {t("details.discount", { defaultValue: "Discount" })}
                            </Text>
                            <Text
                                style={[
                                    styles.summaryValueAccent,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                - {formatPrice(discount, currency)}
                            </Text>
                        </View>
                    ) : null}
                    <View style={styles.totalDivider} />
                    <View style={[styles.totalRow, isRTL && styles.rowReverse]}>
                        <Text
                            style={[styles.totalLabel, { textAlign, writingDirection }]}
                        >
                            {t("details.total")}
                        </Text>
                        <Text
                            style={[styles.totalValue, { textAlign, writingDirection }]}
                        >
                            {formatPrice(total, currency)}
                        </Text>
                    </View>
                </Section>

                {/* Payment */}
                {paymentLabel || paymentStatusLabel ? (
                    <Section
                        icon="card-outline"
                        title={t("sections.payment", {
                            defaultValue: "Payment method",
                        })}
                        delay={210}
                    >
                        <View
                            style={[styles.paymentRow, isRTL && styles.rowReverse]}
                        >
                            <View style={styles.paymentIcon}>
                                <Ionicons
                                    name={paymentMethodIcon(order.paymentMethod)}
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                            <View style={styles.paymentBody}>
                                {paymentLabel ? (
                                    <Text
                                        style={[
                                            styles.paymentLabel,
                                            { textAlign, writingDirection },
                                        ]}
                                    >
                                        {paymentLabel}
                                    </Text>
                                ) : null}
                                {paymentStatusLabel ? (
                                    <View
                                        style={[
                                            styles.paymentStatusPill,
                                            isPaid
                                                ? styles.paymentStatusPillPaid
                                                : styles.paymentStatusPillUnpaid,
                                            isRTL && styles.rowReverse,
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.paymentStatusDot,
                                                isPaid
                                                    ? styles.paymentStatusDotPaid
                                                    : styles.paymentStatusDotUnpaid,
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.paymentStatusText,
                                                isPaid
                                                    ? styles.paymentStatusTextPaid
                                                    : styles.paymentStatusTextUnpaid,
                                                { writingDirection },
                                            ]}
                                        >
                                            {paymentStatusLabel}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </Section>
                ) : null}

                {/* Notes */}
                {order.customerNotes ? (
                    <Section
                        icon="chatbubble-ellipses-outline"
                        title={t("sections.notes", {
                            defaultValue: "Your notes",
                        })}
                        delay={260}
                    >
                        <Text
                            style={[styles.notesText, { textAlign, writingDirection }]}
                        >
                            {order.customerNotes}
                        </Text>
                    </Section>
                ) : null}

                {/* Payment instructions + proof upload (online payment only, while unpaid) */}
                {order.paymentMethod === "online" && !isPaid ? (
                    <>
                        {order.restaurantId ? (
                            <Animated.View entering={FadeInUp.delay(285).duration(360)}>
                                <PaymentInfoCard restaurantId={order.restaurantId} />
                            </Animated.View>
                        ) : null}
                        <Animated.View entering={FadeInUp.delay(290).duration(360)}>
                            <PaymentProofCard orderId={order.orderId} />
                        </Animated.View>
                    </>
                ) : null}

                {/* Pick your driver (only while no driver assigned + order is still pre-delivery) */}
                {!order.delivery?.courierName &&
                ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status) &&
                order.delivery?.latitude !== undefined &&
                order.delivery?.longitude !== undefined ? (
                    <Animated.View entering={FadeInUp.delay(292).duration(360)}>
                        <AnimatedPressable
                            onPress={() =>
                                router.push({
                                    pathname: "/orders/[id]/pick-driver",
                                    params: { id: order.orderId },
                                } as never)
                            }
                            haptic="impact"
                            scaleTo={0.97}
                            style={[styles.driverBtn, isRTL && styles.rowReverse]}
                            accessibilityRole="button"
                            accessibilityLabel={t("driver.cta", {
                                defaultValue: "Pick your driver",
                            })}
                        >
                            <View style={styles.driverBtnIcon}>
                                <Ionicons name="bicycle" size={18} color={colors.primary} />
                            </View>
                            <View style={styles.driverBtnTextBlock}>
                                <Text
                                    style={[styles.driverBtnTitle, { writingDirection }]}
                                >
                                    {t("driver.cta", { defaultValue: "Pick your driver" })}
                                </Text>
                                <Text
                                    style={[styles.driverBtnBody, { writingDirection }]}
                                    numberOfLines={1}
                                >
                                    {t("driver.ctaBody", {
                                        defaultValue: "Choose from nearby online drivers",
                                    })}
                                </Text>
                            </View>
                            <Ionicons
                                name={isRTL ? "chevron-back" : "chevron-forward"}
                                size={18}
                                color={colors.outline}
                            />
                        </AnimatedPressable>
                    </Animated.View>
                ) : null}

                {/* Rate order (delivered + not yet rated) */}
                {order.status === "DELIVERED" && !order.rating && !justRated ? (
                    <Animated.View entering={FadeInUp.delay(295).duration(360)}>
                        <AnimatedPressable
                            onPress={() => setRatingOpen(true)}
                            haptic="impact"
                            scaleTo={0.97}
                            style={[styles.rateBtn, isRTL && styles.rowReverse]}
                            accessibilityRole="button"
                            accessibilityLabel={t("rate.cta", {
                                defaultValue: "Rate this order",
                            })}
                        >
                            <View style={styles.rateBtnIcon}>
                                <Ionicons name="star" size={18} color="#F5B400" />
                            </View>
                            <View style={styles.rateBtnTextBlock}>
                                <Text style={[styles.rateBtnTitle, { writingDirection }]}>
                                    {t("rate.cta", {
                                        defaultValue: "Rate this order",
                                    })}
                                </Text>
                                <Text
                                    style={[styles.rateBtnBody, { writingDirection }]}
                                    numberOfLines={1}
                                >
                                    {t("rate.ctaBody", {
                                        defaultValue: "Tell us how it went",
                                    })}
                                </Text>
                            </View>
                            <Ionicons
                                name={isRTL ? "chevron-back" : "chevron-forward"}
                                size={18}
                                color={colors.outline}
                            />
                        </AnimatedPressable>
                    </Animated.View>
                ) : null}

                {/* Existing rating display — either from the server (order.rating)
                    or right after a successful local submit (justRated). */}
                {order.rating || justRated ? (
                    <Animated.View entering={FadeInUp.delay(295).duration(360)}>
                        <View style={styles.ratingCard}>
                            <View style={[styles.ratingHeader, isRTL && styles.rowReverse]}>
                                <Ionicons name="star" size={18} color="#F5B400" />
                                <Text
                                    style={[styles.ratingHeaderText, { writingDirection }]}
                                >
                                    {order.rating
                                        ? t("rate.yourRating", { defaultValue: "Your rating" })
                                        : t("rate.successTitle", {
                                              defaultValue: "Thanks for your feedback!",
                                          })}
                                </Text>
                            </View>
                            {order.rating ? (
                                <View style={[styles.ratingStars, isRTL && styles.rowReverse]}>
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <Ionicons
                                            key={n}
                                            name={n <= (order.rating ?? 0) ? "star" : "star-outline"}
                                            size={22}
                                            color={n <= (order.rating ?? 0) ? "#F5B400" : colors.outline}
                                        />
                                    ))}
                                </View>
                            ) : null}
                            {order.ratingComment ? (
                                <Text
                                    style={[
                                        styles.ratingComment,
                                        { textAlign, writingDirection },
                                    ]}
                                >
                                    {order.ratingComment}
                                </Text>
                            ) : null}
                        </View>
                    </Animated.View>
                ) : null}

                {/* Open order chat */}
                <Animated.View entering={FadeInUp.delay(300).duration(360)}>
                    <AnimatedPressable
                        onPress={() =>
                            router.push({
                                pathname: "/orders/[id]/chat",
                                params: { id: order.orderId },
                            } as never)
                        }
                        haptic="impact"
                        scaleTo={0.97}
                        style={[styles.chatBtn, isRTL && styles.rowReverse]}
                        accessibilityRole="button"
                        accessibilityLabel={t("chat.openTitle", {
                            defaultValue: "Open chat",
                        })}
                    >
                        <View style={styles.chatBtnIcon}>
                            <Ionicons
                                name="chatbubble-ellipses"
                                size={18}
                                color={colors.primary}
                            />
                        </View>
                        <View style={styles.chatBtnTextBlock}>
                            <Text
                                style={[styles.chatBtnTitle, { writingDirection }]}
                            >
                                {t("chat.openTitle", {
                                    defaultValue: "Chat about this order",
                                })}
                            </Text>
                            <Text
                                style={[styles.chatBtnBody, { writingDirection }]}
                                numberOfLines={1}
                            >
                                {t("chat.openBody", {
                                    defaultValue: "Talk to the restaurant or driver",
                                })}
                            </Text>
                        </View>
                        <Ionicons
                            name={isRTL ? "chevron-back" : "chevron-forward"}
                            size={18}
                            color={colors.outline}
                        />
                    </AnimatedPressable>
                </Animated.View>

                {/* Receipt */}
                <Animated.View
                    entering={FadeInUp.delay(310).duration(360)}
                    style={styles.receiptDock}
                >
                    <AnimatedPressable
                        onPress={handleOpenReceipt}
                        disabled={isOpeningReceipt}
                        scaleTo={0.97}
                        haptic="impact"
                        style={[
                            styles.receiptBtn,
                            isRTL && styles.rowReverse,
                        ]}
                        disabledStyle={styles.receiptBtnDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={t("receipt.viewReceipt", {
                            defaultValue: "View receipt",
                        })}
                    >
                        {isOpeningReceipt ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                            <Ionicons
                                name="document-text-outline"
                                size={18}
                                color={colors.onPrimary}
                            />
                        )}
                        <Text
                            style={[styles.receiptBtnText, { writingDirection }]}
                        >
                            {t("receipt.viewReceipt", {
                                defaultValue: "View receipt",
                            })}
                        </Text>
                    </AnimatedPressable>
                </Animated.View>
            </ScrollView>
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
                        {t("details.title")}
                    </Text>
                </View>
                <View style={styles.iconButtonGhost} />
            </View>

            <View style={styles.content}>{content}</View>

            {orderId ? (
                <RatingDialog
                    orderId={orderId}
                    visible={ratingOpen}
                    onClose={() => setRatingOpen(false)}
                    onSubmitted={() => setJustRated(true)}
                />
            ) : null}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    header: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 6,
        paddingBottom: 12,
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
    iconButtonGhost: {
        width: 42,
        height: 42,
    },
    headerTitleBlock: {
        flex: 1,
        alignItems: "center",
    },
    headerEyebrow: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 13,
        textAlign: "center",
    },
    headerTitle: {
        marginTop: 1,
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 20,
        lineHeight: 25,
        textAlign: "center",
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: screen.horizontal,
        paddingTop: 4,
        gap: 14,
    },
    heroCard: {
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 14,
        ...shadows.card,
    },
    heroTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    heroIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    heroTitleBlock: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    heroEyebrow: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    heroTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 18,
        lineHeight: 23,
    },
    refRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "flex-start",
    },
    refText: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.4,
    },
    heroMeta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    heroMetaText: {
        flex: 1,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 15,
    },
    livePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radii.pill,
    },
    livePillOn: {
        backgroundColor: "#D9F5E2",
    },
    livePillOff: {
        backgroundColor: colors.surfaceContainer,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    liveDotOn: {
        backgroundColor: "#0F7A36",
    },
    liveDotOff: {
        backgroundColor: colors.outline,
    },
    liveText: {
        fontFamily: typography.bodyBold,
        fontSize: 10,
        lineHeight: 13,
        letterSpacing: 0.3,
    },
    liveTextOn: {
        color: "#0F7A36",
    },
    liveTextOff: {
        color: colors.outline,
    },
    section: {
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 14,
        ...shadows.soft,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    sectionIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    sectionTitle: {
        flex: 1,
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 19,
    },
    sectionBody: {
        gap: 8,
    },
    itemsList: {
        gap: 12,
    },
    itemDivider: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
        marginVertical: 4,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
        marginTop: 6,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    summaryLabel: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
    },
    summaryValue: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 13,
        lineHeight: 18,
    },
    summaryValueAccent: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 13,
        lineHeight: 18,
    },
    totalDivider: {
        height: 1,
        backgroundColor: colors.surfaceContainerHighest,
        marginVertical: 4,
    },
    totalRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    totalLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 16,
        lineHeight: 20,
    },
    totalValue: {
        fontFamily: typography.headline,
        color: colors.primary,
        fontSize: 20,
        lineHeight: 25,
    },
    emptyText: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingVertical: 4,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    infoBody: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    infoLabel: {
        fontFamily: typography.body,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    infoValue: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    paymentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    paymentIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    paymentBody: {
        flex: 1,
        gap: 6,
    },
    paymentLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    paymentStatusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        alignSelf: "flex-start",
    },
    paymentStatusPillPaid: {
        backgroundColor: "#D9F5E2",
    },
    paymentStatusPillUnpaid: {
        backgroundColor: "#FFF4E0",
    },
    paymentStatusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    paymentStatusDotPaid: {
        backgroundColor: "#0F7A36",
    },
    paymentStatusDotUnpaid: {
        backgroundColor: "#A66A00",
    },
    paymentStatusText: {
        fontFamily: typography.bodyBold,
        fontSize: 11,
        lineHeight: 14,
    },
    paymentStatusTextPaid: {
        color: "#0F7A36",
    },
    paymentStatusTextUnpaid: {
        color: "#A66A00",
    },
    notesText: {
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 20,
        padding: 12,
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
    },
    receiptDock: {
        marginTop: 2,
    },
    chatBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        ...shadows.soft,
    },
    chatBtnIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    chatBtnTextBlock: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    chatBtnTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    chatBtnBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    driverBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        ...shadows.soft,
    },
    driverBtnIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    driverBtnTextBlock: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    driverBtnTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    driverBtnBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    rateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        ...shadows.soft,
    },
    rateBtnIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#FFF7DC",
        alignItems: "center",
        justifyContent: "center",
    },
    rateBtnTextBlock: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    rateBtnTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    rateBtnBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    ratingCard: {
        padding: 14,
        borderRadius: radii.lg,
        backgroundColor: colors.card,
        gap: 10,
        ...shadows.soft,
    },
    ratingHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    ratingHeaderText: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
    ratingStars: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingComment: {
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 13,
        lineHeight: 18,
    },
    trackBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.primary,
        ...shadows.primary,
    },
    trackIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    trackTextBlock: {
        flex: 1,
        minWidth: 0,
    },
    trackTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 14,
        lineHeight: 18,
    },
    trackBody: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: "rgba(255,255,255,0.85)",
        fontSize: 12,
        lineHeight: 15,
    },
    // Inert (non-tappable) twin of `pickDriverBtn`, used while we wait for
    // the driver to accept. Same look as the picker, but with a spinner and
    // no chevron — there's nothing to do here until the driver replies.
    waitingDriverCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.faintPrimary,
        marginBottom: 8,
    },
    // Lower-emphasis variant of `trackBtn`. Filled in primary-faint instead of
    // solid primary because this button is optional ("you can pick a driver if
    // you want"), while the tracking button is the primary action once a
    // driver exists.
    pickDriverBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.faintPrimary,
        marginBottom: 8,
    },
    pickDriverIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    pickDriverTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.primary,
        fontSize: 14,
        lineHeight: 18,
    },
    pickDriverBody: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.primary,
        opacity: 0.85,
        fontSize: 12,
        lineHeight: 15,
    },
    receiptBtn: {
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        ...shadows.primary,
    },
    receiptBtnDisabled: {
        opacity: 0.6,
    },
    receiptBtnText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 15,
        lineHeight: 19,
    },
    stateWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 30,
        gap: 10,
    },
    stateIllustration: {
        width: 142,
        height: 142,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    stateOrb: {
        position: "absolute",
        width: 142,
        height: 142,
        borderRadius: 71,
    },
    stateIconCircle: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.card,
    },
    stateTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 22,
        lineHeight: 28,
        textAlign: "center",
    },
    stateBody: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
    },
    stateButton: {
        marginTop: 14,
        minHeight: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 22,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        ...shadows.primary,
    },
    stateButtonText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 15,
        lineHeight: 19,
    },
});

export default OrderDetailsScreen;
