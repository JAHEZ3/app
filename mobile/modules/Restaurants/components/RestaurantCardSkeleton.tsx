import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';

const Shimmer = ({ style }: { style?: any }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    }, [progress]);

    const animated = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.5, 1], [0.55, 1, 0.55]),
    }));

    return <Animated.View style={[styles.shimmer, animated, style]} />;
};

const RestaurantCardSkeleton = () => {
    return (
        <View style={styles.card}>
            <Shimmer style={styles.cover} />
            <View style={styles.body}>
                <Shimmer style={styles.titleLine} />
                <Shimmer style={styles.metaLine} />
                <View style={styles.footerRow}>
                    <Shimmer style={styles.pill} />
                    <Shimmer style={styles.pillSm} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    shimmer: { backgroundColor: '#E5E7EB', borderRadius: 8 },
    cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 0 },
    body: { padding: 16, gap: 10 },
    titleLine: { width: '60%', height: 18 },
    metaLine: { width: '40%', height: 12 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    pill: { width: 110, height: 24, borderRadius: 999 },
    pillSm: { width: 70, height: 20, borderRadius: 999 },
});

export default RestaurantCardSkeleton;
