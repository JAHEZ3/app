import React, { memo, useCallback } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { DeliveryAddressInput } from "../types";

interface Props {
    value: DeliveryAddressInput;
    onChange: (next: DeliveryAddressInput) => void;
    label?: string;
    placeholderAddress?: string;
    placeholderCity?: string;
    placeholderStreet?: string;
    changeLabel?: string;
    error?: string | null;
}

function DeliveryAddressCard({
    value,
    onChange,
    label,
    placeholderAddress,
    placeholderCity,
    placeholderStreet,
    changeLabel,
    error,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";

    const patch = useCallback(
        (partial: Partial<DeliveryAddressInput>) => onChange({ ...value, ...partial }),
        [onChange, value],
    );

    return (
        <View style={styles.wrap}>
            {label ? (
                <Text style={[styles.fieldLabel, { textAlign, writingDirection }]}>
                    {label}
                </Text>
            ) : null}

            <View style={[styles.inputRow, isRTL && styles.rowReverse, error && styles.inputError]}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <TextInput
                    value={value.addressLine}
                    onChangeText={(text) => patch({ addressLine: text })}
                    placeholder={placeholderAddress}
                    placeholderTextColor={colors.outline}
                    style={[styles.input, { textAlign, writingDirection }]}
                    multiline
                    accessibilityLabel={placeholderAddress}
                />
            </View>

            <View style={styles.row2}>
                <View style={[styles.inputRow, styles.flex1, isRTL && styles.rowReverse]}>
                    <Ionicons name="business-outline" size={16} color={colors.outline} />
                    <TextInput
                        value={value.city ?? ""}
                        onChangeText={(text) => patch({ city: text })}
                        placeholder={placeholderCity}
                        placeholderTextColor={colors.outline}
                        style={[styles.input, { textAlign, writingDirection }]}
                    />
                </View>
                <View style={[styles.inputRow, styles.flex1, isRTL && styles.rowReverse]}>
                    <Ionicons name="trail-sign-outline" size={16} color={colors.outline} />
                    <TextInput
                        value={value.street ?? ""}
                        onChangeText={(text) => patch({ street: text })}
                        placeholder={placeholderStreet}
                        placeholderTextColor={colors.outline}
                        style={[styles.input, { textAlign, writingDirection }]}
                    />
                </View>
            </View>

            {error ? (
                <Text style={[styles.errorText, { textAlign, writingDirection }]}>{error}</Text>
            ) : null}

            {changeLabel ? (
                <AnimatedPressable
                    onPress={() => undefined}
                    haptic="selection"
                    scaleTo={0.97}
                    style={[styles.changeRow, isRTL && styles.rowReverse]}
                    accessibilityRole="button"
                >
                    <Ionicons name="map-outline" size={14} color={colors.primary} />
                    <Text style={[styles.changeText, { textAlign, writingDirection }]}>
                        {changeLabel}
                    </Text>
                </AnimatedPressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: 10,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    flex1: {
        flex: 1,
    },
    fieldLabel: {
        fontFamily: typography.bodyBold,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 50,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
    },
    inputError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 19,
        padding: 0,
    },
    row2: {
        flexDirection: "row",
        gap: 10,
    },
    errorText: {
        fontFamily: typography.bodyMedium,
        color: colors.error,
        fontSize: 12,
        lineHeight: 16,
    },
    changeRow: {
        marginTop: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: colors.faintPrimary,
        ...shadows.soft,
    },
    changeText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 12,
        lineHeight: 15,
    },
});

export default memo(DeliveryAddressCard);
