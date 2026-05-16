import React, { useCallback, useEffect, useMemo } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/useLanguageStore";

const formatPrice = (value: number, currency: string) =>
    `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

function OrderSuccessScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("checkout");
    const { t: tCart } = useTranslation("cart");
    const isRTL = useLanguageStore((s) => s.isRTL);
    const textAlign = isRTL ? "right" : "left";
    const writingDirection = isRTL ? "rtl" : "ltr";
    const params = useLocalSearchParams<{
        orderId?: string;
        orderNumber?: string;
        total?: string;
        paymentMethod?: string;
    }>();

    const orderId = params.orderId ?? "";
    const orderNumber = params.orderNumber ?? "";
    const total = useMemo(() => {
        const parsed = Number.parseFloat(params.total ?? "0");
        return Number.isFinite(parsed) ? parsed : 0;
    }, [params.total]);
    const paymentMethod = params.paymentMethod ?? "";
    const currency = tCart("price.currency");

    const displayOrderRef = orderNumber || orderId.slice(0, 8).toUpperCase();

    const checkScale = useSharedValue(0);
    const ringScale = useSharedValue(0);

    useEffect(() => {
        ringScale.value = withTiming(1, { duration: 480 });
        checkScale.value = withDelay(
            220,
            withSequence(
                withSpring(1.15, { damping: 14, stiffness: 200 }),
                withSpring(1, { damping: 16, stiffness: 220 }),
            ),
        );
    }, [checkScale, ringScale]);

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ringScale.value }],
        opacity: ringScale.value,
    }));
    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
        opacity: checkScale.value > 0 ? 1 : 0,
    }));

    const handleTrack = useCallback(() => {
        if (orderId) {
            router.replace({
                pathname: "/orders/[id]",
                params: { id: orderId },
            } as never);
        } else {
            router.replace("/orders" as never);
        }
    }, [orderId]);

    const handleHome = useCallback(() => {
        router.replace("/home/Home" as never);
    }, []);

    const paymentLabel = useMemo(() => {
        if (paymentMethod === "cash_on_delivery") return t("payment.cash.label");
        if (paymentMethod === "card") return t("payment.card.label");
        if (paymentMethod === "online") return t("payment.online.label");
        return paymentMethod;
    }, [paymentMethod, t]);

    return (
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <Animated.View entering={FadeIn.duration(380)} style={styles.illustration}>
                    <Animated.View style={[styles.ring, ringStyle]}>
                        <LinearGradient
                            colors={["#FFEFE3", "#FFD9C2"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.ringInner}
                        />
                    </Animated.View>
                    <Animated.View style={[styles.checkCircle, checkStyle]}>
                        <Ionicons name="checkmark" size={48} color={colors.onPrimary} />
                    </Animated.View>
                </Animated.View>

                <Animated.Text
                    entering={FadeInUp.delay(220).duration(420)}
                    style={[styles.title, { writingDirection }]}
                >
                    {t("success.title")}
                </Animated.Text>

                <Animated.Text
                    entering={FadeInUp.delay(280).duration(420)}
                    style={[styles.subtitle, { writingDirection }]}
                >
                    {t("success.subtitle")}
                </Animated.Text>

                <Animated.View
                    entering={FadeInDown.delay(360).duration(420)}
                    style={styles.card}
                >
                    {displayOrderRef ? (
                        <Row
                            label={t("success.orderId")}
                            value={`#${displayOrderRef}`}
                            isRTL={isRTL}
                            textAlign={textAlign}
                            writingDirection={writingDirection}
                            monospace
                        />
                    ) : null}
                    {paymentLabel ? (
                        <Row
                            label={t("success.payment")}
                            value={paymentLabel}
                            isRTL={isRTL}
                            textAlign={textAlign}
                            writingDirection={writingDirection}
                        />
                    ) : null}
                    {total > 0 ? (
                        <Row
                            label={t("success.total")}
                            value={formatPrice(total, currency)}
                            isRTL={isRTL}
                            textAlign={textAlign}
                            writingDirection={writingDirection}
                            accent
                        />
                    ) : null}

                    <View style={[styles.etaRow, isRTL && styles.rowReverse]}>
                        <Ionicons name="bicycle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.etaText, { textAlign, writingDirection }]}>
                            {t("success.eta")}
                        </Text>
                    </View>
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.delay(440).duration(420)}
                    style={styles.actions}
                >
                    <AnimatedPressable
                        onPress={handleTrack}
                        scaleTo={0.96}
                        haptic="impact"
                        style={[styles.primaryBtn, isRTL && styles.rowReverse]}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.primaryBtnText, { writingDirection }]}>
                            {t("success.trackOrder")}
                        </Text>
                        <Ionicons
                            name={isRTL ? "arrow-back" : "arrow-forward"}
                            size={18}
                            color={colors.onPrimary}
                        />
                    </AnimatedPressable>

                    <AnimatedPressable
                        onPress={handleHome}
                        scaleTo={0.96}
                        haptic="selection"
                        style={styles.secondaryBtn}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.secondaryBtnText, { writingDirection }]}>
                            {t("success.backHome")}
                        </Text>
                    </AnimatedPressable>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

function Row({
    label,
    value,
    isRTL,
    textAlign,
    writingDirection,
    monospace = false,
    accent = false,
}: {
    label: string;
    value: string;
    isRTL: boolean;
    textAlign: "left" | "right";
    writingDirection: "ltr" | "rtl";
    monospace?: boolean;
    accent?: boolean;
}) {
    return (
        <View style={[styles.row, isRTL && styles.rowReverse]}>
            <Text style={[styles.rowLabel, { textAlign, writingDirection }]}>{label}</Text>
            <Text
                style={[
                    styles.rowValue,
                    accent && styles.rowValueAccent,
                    monospace && styles.rowValueMono,
                    { textAlign, writingDirection },
                ]}
            >
                {value}
            </Text>
        </View>
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
    content: {
        flex: 1,
        paddingHorizontal: screen.horizontal,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
    },
    illustration: {
        width: 160,
        height: 160,
        alignItems: "center",
        justifyContent: "center",
    },
    ring: {
        position: "absolute",
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    ringInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    checkCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        ...shadows.primary,
    },
    title: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 26,
        lineHeight: 33,
        textAlign: "center",
    },
    subtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        paddingHorizontal: 20,
    },
    card: {
        width: "100%",
        padding: 18,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        ...shadows.card,
        gap: 10,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    rowLabel: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 18,
    },
    rowValue: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 19,
        flexShrink: 1,
    },
    rowValueAccent: {
        color: colors.primary,
        fontFamily: typography.headlineSemi,
        fontSize: 16,
        lineHeight: 21,
    },
    rowValueMono: {
        letterSpacing: 1,
    },
    etaRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: colors.faintPrimary,
        alignSelf: "flex-start",
    },
    etaText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 12,
        lineHeight: 15,
    },
    actions: {
        width: "100%",
        gap: 10,
        marginTop: 8,
    },
    primaryBtn: {
        minHeight: 54,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 22,
        ...shadows.primary,
    },
    primaryBtnText: {
        fontFamily: typography.headlineSemi,
        color: colors.onPrimary,
        fontSize: 15,
        lineHeight: 19,
    },
    secondaryBtn: {
        minHeight: 50,
        borderRadius: radii.pill,
        backgroundColor: colors.card,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.surfaceContainer,
    },
    secondaryBtnText: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 14,
        lineHeight: 18,
    },
});

export default OrderSuccessScreen;
