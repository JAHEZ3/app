import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { OrderType } from "../types";

interface Option {
    key: OrderType;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
    badge?: string;
}

interface Props {
    value: OrderType;
    options: Option[];
    onChange: (next: OrderType) => void;
    disabled?: boolean;
}

/**
 * Three-way fulfilment-mode picker (delivery / pickup / scheduled). Renders as
 * a vertical card stack — each card shows an icon, label, short description,
 * and a radio dot. Selecting "scheduled" doesn't open a date picker here; the
 * parent screen renders the picker conditionally when value === "scheduled".
 */
function OrderTypeSelector({ value, options, onChange, disabled }: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <View style={styles.wrap}>
            {options.map((opt) => {
                const selected = value === opt.key;
                return (
                    <AnimatedPressable
                        key={opt.key}
                        onPress={() => !disabled && onChange(opt.key)}
                        scaleTo={0.97}
                        haptic="selection"
                        disabled={disabled}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled }}
                        accessibilityLabel={opt.label}
                        style={[
                            styles.row,
                            isRTL && styles.rowReverse,
                            selected && styles.rowSelected,
                            disabled && styles.rowDisabled,
                        ]}
                    >
                        <View
                            style={[
                                styles.iconBubble,
                                selected && styles.iconBubbleSelected,
                            ]}
                        >
                            <Ionicons
                                name={opt.icon}
                                size={20}
                                color={selected ? colors.surface : colors.primary}
                            />
                        </View>
                        <View style={styles.text}>
                            <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
                                <Text
                                    style={[
                                        styles.title,
                                        { textAlign, writingDirection },
                                        selected && styles.titleSelected,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                                {opt.badge ? (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{opt.badge}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text
                                style={[
                                    styles.description,
                                    { textAlign, writingDirection },
                                ]}
                                numberOfLines={2}
                            >
                                {opt.description}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.radio,
                                selected && styles.radioSelected,
                            ]}
                        >
                            {selected ? (
                                <View style={styles.radioInner} />
                            ) : null}
                        </View>
                    </AnimatedPressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 10 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: radii.lg,
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
        backgroundColor: colors.surface,
    },
    rowReverse: { flexDirection: "row-reverse" },
    rowSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.faintPrimary,
    },
    rowDisabled: { opacity: 0.5 },
    iconBubble: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.faintPrimary,
    },
    iconBubbleSelected: { backgroundColor: colors.primary },
    text: { flex: 1, gap: 2 },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
    },
    title: {
        fontFamily: typography.bodyBold,
        fontSize: 14,
        color: colors.onSurface,
    },
    titleSelected: { color: colors.primary },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    badgeText: {
        fontFamily: typography.bodyMedium,
        fontSize: 9,
        color: colors.surface,
    },
    description: {
        fontFamily: typography.body,
        fontSize: 11,
        color: colors.outline,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.outline,
        alignItems: "center",
        justifyContent: "center",
    },
    radioSelected: { borderColor: colors.primary },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
});

export default memo(OrderTypeSelector);
