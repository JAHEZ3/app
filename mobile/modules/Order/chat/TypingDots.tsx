import React, { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Props {
    label?: string | null;
}

function Dot({ delay }: { delay: number }) {
    const v = useSharedValue(0);
    useEffect(() => {
        v.value = withDelay(
            delay,
            withRepeat(
                withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
                -1,
                true,
            ),
        );
    }, [delay, v]);
    const style = useAnimatedStyle(() => ({
        opacity: interpolate(v.value, [0, 1], [0.3, 1]),
        transform: [{ translateY: interpolate(v.value, [0, 1], [0, -2]) }],
    }));
    return <Animated.View style={[styles.dot, style]} />;
}

function TypingDots({ label }: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const writingDirection = isRTL ? "rtl" : "ltr";

    return (
        <View
            style={[
                styles.wrap,
                { alignItems: isRTL ? "flex-end" : "flex-start" },
            ]}
        >
            <View style={styles.bubble}>
                <View style={styles.dots}>
                    <Dot delay={0} />
                    <Dot delay={140} />
                    <Dot delay={280} />
                </View>
                {label ? (
                    <Text style={[styles.label, { writingDirection }]}>{label}</Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginBottom: 6,
        paddingHorizontal: 14,
    },
    bubble: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.lg,
        borderTopLeftRadius: 6,
        backgroundColor: colors.card,
        ...shadows.soft,
    },
    dots: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.outline,
    },
    label: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
});

export default memo(TypingDots);
