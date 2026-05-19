import React, { memo, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from "react-native-reanimated";
import { colors } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";

interface Props {
    value: number;
    onChange: (next: number) => void;
    size?: number;
    /** Total number of stars (default 5). */
    max?: number;
    disabled?: boolean;
    accessibilityLabel?: string;
}

function AnimatedStar({
    filled,
    size,
    onPress,
    disabled,
    /** Triggers a tiny pop when this star is the one the user just tapped. */
    pulseKey,
}: {
    filled: boolean;
    size: number;
    onPress: () => void;
    disabled?: boolean;
    pulseKey: number;
}) {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (pulseKey === 0) return;
        scale.value = withSequence(
            withSpring(1.25, { damping: 12, stiffness: 220 }),
            withSpring(1, { damping: 14, stiffness: 200 }),
        );
    }, [pulseKey, scale]);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable
            onPress={() => {
                if (disabled) return;
                Haptics.selectionAsync().catch(() => undefined);
                onPress();
            }}
            disabled={disabled}
            hitSlop={8}
            accessibilityRole="button"
        >
            <Animated.View style={style}>
                <Ionicons
                    name={filled ? "star" : "star-outline"}
                    size={size}
                    color={filled ? "#F5B400" : colors.surfaceContainerHighest}
                />
            </Animated.View>
        </Pressable>
    );
}

function StarRating({
    value,
    onChange,
    size = 32,
    max = 5,
    disabled = false,
    accessibilityLabel,
}: Props) {
    const isRTL = useLanguageStore((s) => s.isRTL);

    return (
        <View
            style={[
                styles.row,
                { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel}
            accessibilityValue={{ min: 0, max, now: value }}
        >
            {Array.from({ length: max }).map((_, i) => {
                const starValue = i + 1;
                return (
                    <AnimatedStar
                        key={i}
                        filled={starValue <= value}
                        size={size}
                        disabled={disabled}
                        // Re-key on each tap of THIS star so the spring re-runs.
                        pulseKey={starValue === value ? value : 0}
                        onPress={() => onChange(starValue)}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        alignItems: "center",
        gap: 10,
    },
});

export default memo(StarRating);
