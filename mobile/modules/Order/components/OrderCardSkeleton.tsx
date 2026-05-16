import React, { memo, useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { colors, radii, shadows } from "@/components/ui/theme";

interface Props {
    delay?: number;
}

function SkeletonBlock({ style }: { style?: ViewStyle | ViewStyle[] }) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1100 }),
            -1,
            true,
        );
    }, [shimmer]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.45, 0.95]),
    }));

    return <Animated.View style={[styles.block, style, animatedStyle]} />;
}

function OrderCardSkeleton(_: Props) {
    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <SkeletonBlock style={styles.avatar} />
                <View style={styles.titleBlock}>
                    <SkeletonBlock style={styles.lineLg} />
                    <SkeletonBlock style={styles.lineSm} />
                </View>
                <SkeletonBlock style={styles.chevron} />
            </View>

            <View style={styles.previewRow}>
                <View style={styles.stack}>
                    <SkeletonBlock style={styles.thumb} />
                    <SkeletonBlock style={[styles.thumb, styles.thumbOffset]} />
                    <SkeletonBlock style={[styles.thumb, styles.thumbOffset2]} />
                </View>
                <View style={styles.previewText}>
                    <SkeletonBlock style={styles.lineMd} />
                    <SkeletonBlock style={styles.lineSm} />
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
                <SkeletonBlock style={styles.badge} />
                <View style={styles.totalBlock}>
                    <SkeletonBlock style={styles.lineSmRight} />
                    <SkeletonBlock style={styles.lineLgRight} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 12,
        ...shadows.soft,
    },
    block: {
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: 8,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    titleBlock: {
        flex: 1,
        gap: 8,
    },
    lineLg: {
        height: 14,
        width: "70%",
        borderRadius: 7,
    },
    lineSm: {
        height: 10,
        width: "45%",
        borderRadius: 5,
    },
    lineMd: {
        height: 12,
        width: "85%",
        borderRadius: 6,
    },
    lineSmRight: {
        height: 9,
        width: 60,
        borderRadius: 5,
        alignSelf: "flex-end",
    },
    lineLgRight: {
        height: 16,
        width: 86,
        borderRadius: 7,
        alignSelf: "flex-end",
    },
    chevron: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    previewRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    stack: {
        flexDirection: "row",
    },
    thumb: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: colors.card,
    },
    thumbOffset: {
        marginLeft: -10,
    },
    thumbOffset2: {
        marginLeft: -10,
    },
    previewText: {
        flex: 1,
        gap: 6,
    },
    divider: {
        height: 1,
        backgroundColor: colors.surfaceContainer,
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    badge: {
        width: 90,
        height: 22,
        borderRadius: radii.pill,
    },
    totalBlock: {
        gap: 6,
        alignItems: "flex-end",
    },
});

export default memo(OrderCardSkeleton);
