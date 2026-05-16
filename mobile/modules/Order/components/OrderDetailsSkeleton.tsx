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

function Block({ style }: { style?: ViewStyle | ViewStyle[] }) {
    const shimmer = useSharedValue(0);
    useEffect(() => {
        shimmer.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    }, [shimmer]);
    const animated = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.45, 0.95]),
    }));
    return <Animated.View style={[styles.block, style, animated]} />;
}

function HeroSkeleton() {
    return (
        <View style={styles.hero}>
            <View style={styles.row}>
                <Block style={styles.avatar} />
                <View style={styles.flex}>
                    <Block style={styles.lineSm} />
                    <Block style={styles.lineLg} />
                    <Block style={styles.lineMd} />
                </View>
            </View>
            <View style={styles.row}>
                <Block style={styles.badge} />
                <Block style={styles.lineFlexShort} />
            </View>
        </View>
    );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <View style={styles.section}>
            <View style={styles.row}>
                <Block style={styles.iconSm} />
                <Block style={styles.headerLine} />
            </View>
            {Array.from({ length: rows }).map((_, i) => (
                <View key={i} style={styles.itemRow}>
                    <Block style={styles.itemThumb} />
                    <View style={styles.flex}>
                        <Block style={styles.lineMd} />
                        <Block style={styles.lineSm} />
                    </View>
                    <Block style={styles.itemPrice} />
                </View>
            ))}
        </View>
    );
}

function TimelineSkeleton() {
    return (
        <View style={styles.section}>
            <View style={styles.row}>
                <Block style={styles.iconSm} />
                <Block style={styles.headerLine} />
            </View>
            {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.tlRow}>
                    <View style={styles.tlRail}>
                        <Block style={styles.tlDot} />
                        {i < 3 ? <View style={styles.tlLine} /> : null}
                    </View>
                    <View style={styles.flex}>
                        <Block style={styles.lineMd} />
                        <Block style={styles.lineSm} />
                    </View>
                </View>
            ))}
        </View>
    );
}

function OrderDetailsSkeleton() {
    return (
        <View style={styles.wrap}>
            <HeroSkeleton />
            <TimelineSkeleton />
            <SectionSkeleton rows={2} />
            <SectionSkeleton rows={3} />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        gap: 14,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    flex: {
        flex: 1,
        gap: 8,
    },
    block: {
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    hero: {
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 14,
        ...shadows.card,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    lineSm: {
        height: 10,
        width: "40%",
        borderRadius: 5,
    },
    lineMd: {
        height: 13,
        width: "70%",
        borderRadius: 6,
    },
    lineLg: {
        height: 18,
        width: "55%",
        borderRadius: 7,
    },
    lineFlexShort: {
        height: 11,
        flex: 1,
        borderRadius: 5,
    },
    badge: {
        width: 90,
        height: 22,
        borderRadius: radii.pill,
    },
    section: {
        padding: 16,
        borderRadius: radii.xl,
        backgroundColor: colors.card,
        gap: 12,
        ...shadows.soft,
    },
    iconSm: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    headerLine: {
        height: 14,
        width: 110,
        borderRadius: 6,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    itemThumb: {
        width: 52,
        height: 52,
        borderRadius: radii.md,
    },
    itemPrice: {
        width: 60,
        height: 14,
        borderRadius: 6,
    },
    tlRow: {
        flexDirection: "row",
        gap: 12,
    },
    tlRail: {
        alignItems: "center",
        width: 30,
    },
    tlDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    tlLine: {
        flex: 1,
        minHeight: 18,
        width: 2,
        backgroundColor: colors.surfaceContainerHighest,
        marginVertical: 2,
        borderRadius: 2,
    },
});

export default memo(OrderDetailsSkeleton);
