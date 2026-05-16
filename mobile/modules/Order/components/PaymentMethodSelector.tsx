import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { PaymentMethod } from "../types";

export interface PaymentMethodOption {
    key: PaymentMethod;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    badge?: string;
}

interface Props {
    value: PaymentMethod;
    options: PaymentMethodOption[];
    onChange: (next: PaymentMethod) => void;
    disabled?: boolean;
}

function PaymentMethodSelector({ value, options, onChange, disabled }: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <View style={styles.list}>
            {options.map((option) => {
                const selected = option.key === value;
                return (
                    <AnimatedPressable
                        key={option.key}
                        onPress={() => onChange(option.key)}
                        disabled={disabled}
                        scaleTo={0.97}
                        haptic="selection"
                        style={[
                            styles.option,
                            isRTL && styles.rowReverse,
                            selected && styles.optionSelected,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled }}
                        accessibilityLabel={option.label}
                    >
                        <View
                            style={[
                                styles.iconWrap,
                                selected && styles.iconWrapSelected,
                            ]}
                        >
                            <Ionicons
                                name={option.icon}
                                size={20}
                                color={selected ? colors.onPrimary : colors.primary}
                            />
                        </View>

                        <View style={styles.textBlock}>
                            <View style={[styles.titleRow, isRTL && styles.rowReverse]}>
                                <Text
                                    style={[
                                        styles.title,
                                        { textAlign, writingDirection },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {option.label}
                                </Text>
                                {option.badge ? (
                                    <View style={styles.badge}>
                                        <Text
                                            style={[
                                                styles.badgeText,
                                                { textAlign, writingDirection },
                                            ]}
                                        >
                                            {option.badge}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {option.description ? (
                                <Text
                                    style={[
                                        styles.description,
                                        { textAlign, writingDirection },
                                    ]}
                                    numberOfLines={2}
                                >
                                    {option.description}
                                </Text>
                            ) : null}
                        </View>

                        <View
                            style={[
                                styles.radioOuter,
                                selected && styles.radioOuterSelected,
                            ]}
                        >
                            {selected ? <View style={styles.radioInner} /> : null}
                        </View>
                    </AnimatedPressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    list: {
        gap: 10,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.surfaceContainer,
    },
    optionSelected: {
        borderColor: colors.primary,
        backgroundColor: "#FFF8F2",
        ...shadows.soft,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    iconWrapSelected: {
        backgroundColor: colors.primary,
    },
    textBlock: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    title: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
        flexShrink: 1,
    },
    description: {
        marginTop: 2,
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        lineHeight: 16,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radii.pill,
        backgroundColor: colors.faintPrimary,
    },
    badgeText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 10,
        lineHeight: 12,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.surfaceContainerHighest,
        alignItems: "center",
        justifyContent: "center",
    },
    radioOuterSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
});

export default memo(PaymentMethodSelector);
