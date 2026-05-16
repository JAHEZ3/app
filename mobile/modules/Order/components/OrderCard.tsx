import React, { memo, useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useCartT, useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderItemsPreview from "./OrderItemsPreview";
import type { OrderListItem } from "../types";

interface OrderCardProps {
    order: OrderListItem;
    onPress: (order: OrderListItem) => void;
    index?: number;
}

const formatPrice = (value: number, currency: string) =>
    `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const formatRelative = (
    iso: string,
    locale: string,
    labels: { justNow: string; minutes: string; hours: string; yesterday: string },
): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const now = Date.now();
    const diffMin = Math.floor((now - date.getTime()) / 60000);

    if (diffMin < 1) return labels.justNow;
    if (diffMin < 60) return labels.minutes.replace("{{count}}", String(diffMin));
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return labels.hours.replace("{{count}}", String(diffHours));
    if (diffHours < 48) return labels.yesterday;

    try {
        return date.toLocaleDateString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return date.toLocaleDateString();
    }
};

function OrderCard({ order, onPress, index = 0 }: OrderCardProps) {
    const { t } = useOrdersT();
    const { t: tCart } = useCartT();
    const isRTL = useLanguageStore((state) => state.isRTL);
    const language = useLanguageStore((state) => state.language);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";
    const currency = tCart("price.currency");

    const formattedDate = useMemo(
        () =>
            formatRelative(order.createdAt, language === "ar" ? "ar" : "en-GB", {
                justNow: t("relativeTime.justNow", { defaultValue: "Just now" }),
                minutes: t("relativeTime.minutes", {
                    count: 0,
                    defaultValue: "{{count}}m ago",
                }),
                hours: t("relativeTime.hours", {
                    count: 0,
                    defaultValue: "{{count}}h ago",
                }),
                yesterday: t("relativeTime.yesterday", { defaultValue: "Yesterday" }),
            }),
        [order.createdAt, language, t],
    );

    const itemCount = useMemo(() => {
        if (typeof order.itemCount === "number") return order.itemCount;
        if (order.items?.length) {
            return order.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
        }
        return 0;
    }, [order.itemCount, order.items]);

    const itemsLabel = itemCount > 0 ? tCart("items.count", { count: itemCount }) : null;
    const orderNumber = order.orderNumber ?? order.orderId.slice(0, 8).toUpperCase();
    const summaryLabel = itemsLabel
        ? `${itemsLabel} · ${formatPrice(order.total ?? 0, currency)}`
        : formatPrice(order.total ?? 0, currency);

    return (
        <Animated.View entering={FadeInUp.delay(index * 40).duration(360)}>
            <AnimatedPressable
                onPress={() => onPress(order)}
                haptic="impact"
                scaleTo={0.985}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={`${order.restaurantName ?? ""} #${orderNumber}`}
            >
                <View style={[styles.topRow, isRTL && styles.rowReverse]}>
                    <View style={styles.avatarWrap}>
                        {order.restaurantImage ? (
                            <Image
                                source={{ uri: order.restaurantImage }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Ionicons
                                    name="storefront"
                                    size={20}
                                    color={colors.primary}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.titleBlock}>
                        <Text
                            style={[styles.restaurant, { textAlign, writingDirection }]}
                            numberOfLines={1}
                        >
                            {order.restaurantName ?? t("details.title")}
                        </Text>
                        <View style={[styles.metaInline, isRTL && styles.rowReverse]}>
                            <Text
                                style={[
                                    styles.orderNumber,
                                    { textAlign, writingDirection },
                                ]}
                                numberOfLines={1}
                            >
                                #{orderNumber}
                            </Text>
                            <View style={styles.dot} />
                            <Text
                                style={[
                                    styles.dateText,
                                    { textAlign, writingDirection },
                                ]}
                                numberOfLines={1}
                            >
                                {formattedDate}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.chevronWrap}>
                        <Ionicons
                            name={isRTL ? "chevron-back" : "chevron-forward"}
                            size={16}
                            color={colors.outline}
                        />
                    </View>
                </View>

                {order.items && order.items.length > 0 ? (
                    <View style={styles.previewWrap}>
                        <OrderItemsPreview
                            items={order.items}
                            summaryLabel={summaryLabel}
                        />
                    </View>
                ) : null}

                <View style={styles.divider} />

                <View style={[styles.bottomRow, isRTL && styles.rowReverse]}>
                    <OrderStatusBadge status={order.status} />

                    <View style={[styles.totalBlock, isRTL && styles.totalBlockRtl]}>
                        <Text
                            style={[styles.totalLabel, { textAlign, writingDirection }]}
                        >
                            {t("details.total")}
                            {itemsLabel && !order.items?.length
                                ? ` · ${itemsLabel}`
                                : ""}
                        </Text>
                        <Text
                            style={[styles.totalValue, { textAlign, writingDirection }]}
                        >
                            {formatPrice(order.total ?? 0, currency)}
                        </Text>
                    </View>
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 12,
        ...shadows.soft,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
    },
    avatarFallback: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.faintPrimary,
    },
    titleBlock: {
        flex: 1,
        minWidth: 0,
    },
    restaurant: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 19,
    },
    metaInline: {
        marginTop: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    orderNumber: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.4,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.outline,
        opacity: 0.6,
    },
    dateText: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    chevronWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    previewWrap: {
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    totalBlock: {
        alignItems: "flex-end",
    },
    totalBlockRtl: {
        alignItems: "flex-start",
    },
    totalLabel: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    totalValue: {
        marginTop: 2,
        fontFamily: typography.headlineSemi,
        color: colors.primary,
        fontSize: 17,
        lineHeight: 22,
    },
});

export default memo(OrderCard);
