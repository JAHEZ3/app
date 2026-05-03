import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export function SkeletonLine({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, [opacity]);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            style={[
                animStyle,
                {
                    width: width as number,
                    height,
                    borderRadius,
                    backgroundColor: '#e5e5e5',
                },
                style,
            ]}
        />
    );
}

export function DashboardSkeleton() {
    return (
        <View style={{ flex: 1, backgroundColor: '#F7F7F7', padding: 20 }}>
            {/* Header card */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center', gap: 12 }}>
                <SkeletonLine width={80} height={80} borderRadius={40} />
                <SkeletonLine width={160} height={20} />
                <SkeletonLine width={100} height={14} />
            </View>
            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 8 }}>
                        <SkeletonLine height={24} />
                        <SkeletonLine width={60} height={12} />
                    </View>
                ))}
            </View>
            {/* Info card */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14 }}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <SkeletonLine width={90} height={14} />
                        <SkeletonLine width={120} height={14} />
                    </View>
                ))}
            </View>
        </View>
    );
}
