import React, { memo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

const formatPrice = (value: number, currency: string) =>
    `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

interface Props {
    label: string;
    total: number;
    currency: string;
    loading: boolean;
    disabled: boolean;
    onPress: () => void;
    bottomInset?: number;
    accessibilityLabel?: string;
}

function CheckoutCTA({
    label,
    total,
    currency,
    loading,
    disabled,
    onPress,
    bottomInset = 0,
    accessibilityLabel,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";
    const arrowIcon = isRTL ? "arrow-back" : "arrow-forward";

    return (
        <Animated.View
            entering={FadeInUp.duration(360)}
            style={[styles.dock, { paddingBottom: 16 + bottomInset }]}
        >
            <View style={styles.handle} />
            <AnimatedPressable
                onPress={onPress}
                disabled={disabled || loading}
                scaleTo={0.965}
                haptic="impact"
                style={[
                    styles.btn,
                    isRTL && styles.btnRtl,
                ]}
                disabledStyle={styles.btnDisabled}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? label}
            >
                {loading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={colors.onPrimary} />
                        <Text
                            style={[
                                styles.btnText,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {label}
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text
                            style={[
                                styles.btnText,
                                { textAlign, writingDirection },
                            ]}
                        >
                            {label}
                        </Text>
                        <View style={[styles.amount, isRTL && styles.rowReverse]}>
                            <Text
                                style={[
                                    styles.amountText,
                                    { textAlign, writingDirection },
                                ]}
                            >
                                {formatPrice(total, currency)}
                            </Text>
                            <Ionicons
                                name={arrowIcon}
                                size={16}
                                color={colors.onPrimary}
                            />
                        </View>
                    </>
                )}
            </AnimatedPressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    dock: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        backgroundColor: colors.card,
        ...shadows.card,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    handle: {
        alignSelf: "center",
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginBottom: 10,
    },
    btn: {
        minHeight: 58,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingLeft: 22,
        paddingRight: 8,
        ...shadows.primary,
    },
    btnRtl: {
        flexDirection: "row-reverse",
        paddingLeft: 8,
        paddingRight: 22,
    },
    btnDisabled: {
        opacity: 0.55,
    },
    btnText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 16,
        lineHeight: 21,
    },
    amount: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 14,
        borderRadius: radii.pill,
        backgroundColor: "rgba(255,255,255,0.18)",
    },
    amountText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 13,
        lineHeight: 17,
    },
    loadingRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
});

export default memo(CheckoutCTA);
