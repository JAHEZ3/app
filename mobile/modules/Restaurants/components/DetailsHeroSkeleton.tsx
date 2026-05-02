import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';

const Bar = ({ style }: { style?: any }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    }, [progress]);

    const animated = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.5, 1], [0.55, 1, 0.55]),
    }));

    return <Animated.View style={[styles.bar, animated, style]} />;
};

const DetailsHeroSkeleton = () => (
    <View style={styles.wrap}>
        <Bar style={styles.cover} />
        <View style={styles.body}>
            <Bar style={{ width: '70%', height: 22 }} />
            <Bar style={{ width: '40%', height: 14 }} />
            <Bar style={{ width: '55%', height: 14 }} />
            <View style={styles.row}>
                <Bar style={{ width: 100, height: 28, borderRadius: 999 }} />
                <Bar style={{ width: 80, height: 28, borderRadius: 999 }} />
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: '#F7F7F7' },
    bar: { backgroundColor: '#E5E7EB', borderRadius: 8 },
    cover: { width: '100%', aspectRatio: 16 / 10, borderRadius: 0 },
    body: { padding: 20, gap: 12 },
    row: { flexDirection: 'row', gap: 8, marginTop: 8 },
});

export default DetailsHeroSkeleton;
