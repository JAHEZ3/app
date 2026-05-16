import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { OrderItemPreview } from "../types";

interface Props {
    items: OrderItemPreview[];
    maxVisible?: number;
    summaryLabel?: string;
}

function OrderItemsPreview({ items, maxVisible = 3, summaryLabel }: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    if (!items.length) return null;

    const visible = items.slice(0, maxVisible);
    const remaining = items.length - visible.length;

    return (
        <View style={[styles.wrap, isRTL && styles.rowReverse]}>
            <View style={[styles.stack, isRTL && styles.stackRtl]}>
                {visible.map((item, index) => (
                    <View
                        key={`${item.mealId ?? item.mealName}-${index}`}
                        style={[
                            styles.thumb,
                            {
                                marginLeft: isRTL ? 0 : index === 0 ? 0 : -10,
                                marginRight: isRTL ? (index === 0 ? 0 : -10) : 0,
                                zIndex: visible.length - index,
                            },
                        ]}
                    >
                        {item.mealImage ? (
                            <Image
                                source={{ uri: item.mealImage }}
                                style={styles.thumbImage}
                            />
                        ) : (
                            <View style={styles.thumbFallback}>
                                <Ionicons
                                    name="fast-food-outline"
                                    size={16}
                                    color={colors.primary}
                                />
                            </View>
                        )}
                    </View>
                ))}
                {remaining > 0 ? (
                    <View
                        style={[
                            styles.thumb,
                            styles.thumbMore,
                            {
                                marginLeft: isRTL ? 0 : -10,
                                marginRight: isRTL ? -10 : 0,
                            },
                        ]}
                    >
                        <Text style={styles.thumbMoreText}>+{remaining}</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.textBlock}>
                <Text
                    style={[styles.itemsLine, { textAlign, writingDirection }]}
                    numberOfLines={1}
                >
                    {visible
                        .map((item) =>
                            item.quantity && item.quantity > 1
                                ? `${item.quantity}× ${item.mealName}`
                                : item.mealName,
                        )
                        .join(" · ")}
                </Text>
                {summaryLabel ? (
                    <Text
                        style={[styles.summaryLabel, { textAlign, writingDirection }]}
                        numberOfLines={1}
                    >
                        {summaryLabel}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    stack: {
        flexDirection: "row",
        alignItems: "center",
    },
    stackRtl: {
        flexDirection: "row-reverse",
    },
    thumb: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.card,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    thumbImage: {
        width: "100%",
        height: "100%",
        borderRadius: 19,
    },
    thumbFallback: {
        width: "100%",
        height: "100%",
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    thumbMore: {
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    thumbMoreText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 11,
        lineHeight: 13,
    },
    textBlock: {
        flex: 1,
        minWidth: 0,
    },
    itemsLine: {
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 12,
        lineHeight: 16,
    },
    summaryLabel: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
});

export default memo(OrderItemsPreview);
