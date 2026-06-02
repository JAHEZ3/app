import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useOrdersT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";

type Variant = "waiting" | "accepted" | "rejected" | "ready";

interface Props {
    variant: Variant;
    title?: string;
    body?: string;
}

const VARIANT_THEME: Record<
    Variant,
    {
        icon: keyof typeof Ionicons.glyphMap;
        bg: string;
        fg: string;
        pulse?: boolean;
    }
> = {
    waiting: { icon: "hourglass-outline", bg: "#FFF4E0", fg: "#A66A00", pulse: true },
    accepted: { icon: "checkmark-circle", bg: "#D9F5E2", fg: "#0F7A36" },
    ready: { icon: "bag-handle", bg: "#E5E0FF", fg: "#3F2BB1" },
    rejected: { icon: "close-circle", bg: "#FCE2DD", fg: colors.error },
};

function PulseRing({ color }: { color: string }) {
    const v = useSharedValue(0);
    useEffect(() => {
        v.value = withRepeat(
            withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1,
            false,
        );
    }, [v]);
    const style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(v.value, [0, 1], [0.6, 1.9]) }],
        opacity: interpolate(v.value, [0, 1], [0.45, 0]),
    }));
    return <Animated.View style={[styles.pulseRing, { backgroundColor: color }, style]} />;
}

function OrderStateBanner({ variant, title, body }: Props) {
    const { t } = useOrdersT();
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";
    const textAlign = isRTL ? "right" : "left";

    const theme = VARIANT_THEME[variant];
    const titleText =
        title ??
        t(`state.${variant}.title`, {
            defaultValue:
                variant === "waiting"
                    ? "Waiting for the restaurant"
                    : variant === "accepted"
                      ? "Order accepted"
                      : variant === "ready"
                        ? "Ready for pickup"
                        : "Order rejected",
        });
    const bodyText =
        body ??
        t(`state.${variant}.body`, {
            defaultValue:
                variant === "waiting"
                    ? "We'll notify you as soon as the restaurant confirms."
                    : variant === "accepted"
                      ? "The restaurant is preparing your order."
                      : variant === "ready"
                        ? "Pick up your order from the restaurant."
                        : "Unfortunately the restaurant could not accept this order.",
        });

    return (
        <View style={[styles.card, { backgroundColor: theme.bg }]}>
            <View style={styles.iconWrap}>
                {theme.pulse ? <PulseRing color={theme.fg} /> : null}
                <View style={[styles.iconCircle, { backgroundColor: theme.fg }]}>
                    <Ionicons name={theme.icon} size={22} color={colors.onPrimary} />
                </View>
            </View>
            <View style={styles.text}>
                <Text
                    style={[
                        styles.title,
                        { color: theme.fg, textAlign, writingDirection },
                    ]}
                >
                    {titleText}
                </Text>
                <Text
                    style={[
                        styles.body,
                        { color: theme.fg, textAlign, writingDirection },
                    ]}
                >
                    {bodyText}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: radii.xl,
        ...shadows.soft,
    },
    iconWrap: {
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    pulseRing: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    iconCircle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
    },
    text: {
        flex: 1,
        gap: 3,
    },
    title: {
        fontFamily: typography.headlineSemi,
        fontSize: 15,
        lineHeight: 20,
    },
    body: {
        fontFamily: typography.bodyMedium,
        fontSize: 12,
        lineHeight: 17,
        opacity: 0.92,
    },
});

export default OrderStateBanner;
