import React, { memo, useCallback, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { PromoValidationResult } from "../types";

interface Props {
    placeholder: string;
    applyLabel: string;
    appliedLabel: string;
    removeLabel: string;
    discountLabel: string;
    onApply: (code: string) => void;
    onRemove: () => void;
    applied: PromoValidationResult | null;
    isValidating: boolean;
    error: string | null;
    currency: string;
}

function PromoCodeInput({
    placeholder,
    applyLabel,
    appliedLabel,
    removeLabel,
    discountLabel,
    onApply,
    onRemove,
    applied,
    isValidating,
    error,
    currency,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";
    const [code, setCode] = useState("");

    const handleApply = useCallback(() => {
        const trimmed = code.trim();
        if (!trimmed || isValidating) return;
        onApply(trimmed.toUpperCase());
    }, [code, isValidating, onApply]);

    const handleRemove = useCallback(() => {
        setCode("");
        onRemove();
    }, [onRemove]);

    if (applied) {
        return (
            <View>
                <View
                    style={[
                        styles.appliedBox,
                        isRTL && styles.rowReverse,
                    ]}
                >
                    <View style={styles.appliedIcon}>
                        <Ionicons
                            name="pricetag"
                            size={18}
                            color={colors.primary}
                        />
                    </View>
                    <View style={styles.appliedTextBlock}>
                        <Text
                            style={[
                                styles.appliedLabel,
                                { textAlign, writingDirection },
                            ]}
                            numberOfLines={1}
                        >
                            {appliedLabel} · {applied.code}
                        </Text>
                        <Text
                            style={[
                                styles.appliedDiscount,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {discountLabel}: -{applied.discount.toFixed(
                                applied.discount % 1 === 0 ? 0 : 2,
                            )} {currency}
                        </Text>
                    </View>
                    <AnimatedPressable
                        onPress={handleRemove}
                        haptic="impact"
                        scaleTo={0.92}
                        style={styles.removeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={removeLabel}
                    >
                        <Ionicons
                            name="close"
                            size={16}
                            color={colors.error}
                        />
                    </AnimatedPressable>
                </View>
            </View>
        );
    }

    return (
        <View>
            <View
                style={[
                    styles.row,
                    isRTL && styles.rowReverse,
                    error && styles.rowError,
                ]}
            >
                <Ionicons
                    name="pricetag-outline"
                    size={18}
                    color={colors.outline}
                />
                <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder={placeholder}
                    placeholderTextColor={colors.outline}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={[styles.input, { textAlign, writingDirection }]}
                    editable={!isValidating}
                    onSubmitEditing={handleApply}
                    returnKeyType="done"
                />
                <AnimatedPressable
                    onPress={handleApply}
                    disabled={!code.trim() || isValidating}
                    scaleTo={0.95}
                    haptic="impact"
                    style={styles.applyBtn}
                    disabledStyle={styles.applyBtnDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={applyLabel}
                >
                    {isValidating ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                        <Text
                            style={[
                                styles.applyText,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {applyLabel}
                        </Text>
                    )}
                </AnimatedPressable>
            </View>

            {error ? (
                <Text style={[styles.errorText, { textAlign, writingDirection }]}>
                    {error}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    rowReverse: {
        flexDirection: "row-reverse",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 52,
        paddingLeft: 14,
        paddingRight: 6,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
    },
    rowError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        fontFamily: typography.bodyMedium,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
        padding: 0,
        letterSpacing: 0.5,
    },
    applyBtn: {
        paddingHorizontal: 16,
        height: 40,
        minWidth: 78,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
        ...shadows.primary,
    },
    applyBtnDisabled: {
        opacity: 0.5,
    },
    applyText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 13,
        lineHeight: 16,
    },
    errorText: {
        marginTop: 6,
        fontFamily: typography.bodyMedium,
        color: colors.error,
        fontSize: 12,
        lineHeight: 16,
    },
    appliedBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: radii.lg,
        backgroundColor: colors.faintPrimary,
        borderWidth: 1,
        borderColor: colors.softPrimary,
    },
    appliedIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.soft,
    },
    appliedTextBlock: {
        flex: 1,
        minWidth: 0,
    },
    appliedLabel: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 13,
        lineHeight: 17,
    },
    appliedDiscount: {
        marginTop: 2,
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 12,
        lineHeight: 15,
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#FFE5DA",
        alignItems: "center",
        justifyContent: "center",
    },
});

export default memo(PromoCodeInput);
