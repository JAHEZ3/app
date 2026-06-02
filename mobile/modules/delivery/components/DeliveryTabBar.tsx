import React, { memo, useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import AnimatedPressable from '@/components/ui/AnimatedPressable';
import { colors, shadows } from '@/components/ui/theme';
import { useDeliveryT } from '@/hooks/useAppTranslation';
import { useRTL } from '@/hooks/useRTL';

type TabKey = 'home' | 'tracking' | 'wallet' | 'profile';

interface TabConfig {
    key: TabKey;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    activePath: (path: string) => boolean;
}

const tabs: TabConfig[] = [
    {
        key: 'home',
        route: '/delivery/tabs/home',
        icon: 'home-outline',
        activeIcon: 'home',
        activePath: (p) => p.endsWith('/tabs/home') || p.endsWith('/tabs'),
    },
    {
        key: 'tracking',
        route: '/delivery/tabs/tracking',
        icon: 'navigate-outline',
        activeIcon: 'navigate',
        activePath: (p) => p.endsWith('/tabs/tracking'),
    },
    {
        key: 'wallet',
        route: '/delivery/tabs/wallet',
        icon: 'wallet-outline',
        activeIcon: 'wallet',
        activePath: (p) => p.endsWith('/tabs/wallet'),
    },
    {
        key: 'profile',
        route: '/delivery/tabs/profile',
        icon: 'person-outline',
        activeIcon: 'person',
        activePath: (p) => p.endsWith('/tabs/profile'),
    },
];

interface TabButtonProps {
    tab: TabConfig;
    active: boolean;
    label: string;
}

const TabButton = memo(({ tab, active, label }: TabButtonProps) => {
    const progress = useSharedValue(active ? 1 : 0);

    useEffect(() => {
        progress.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 210, mass: 0.7 });
    }, [active, progress]);

    const bubbleStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1]) }],
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        maxWidth: interpolate(progress.value, [0, 1], [0, 90]),
        marginLeft: interpolate(progress.value, [0, 1], [0, 6]),
    }));

    const handlePress = () => router.navigate(tab.route as never);
    const iconColor = active ? colors.onPrimary : colors.outline;

    return (
        <AnimatedPressable
            onPress={handlePress}
            haptic="impact"
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={styles.tabButton}
        >
            <View style={[styles.iconRow, active && styles.iconRowActive]}>
                <Animated.View pointerEvents="none" style={[styles.activeBubble, bubbleStyle]} />
                <Ionicons name={active ? tab.activeIcon : tab.icon} size={20} color={iconColor} />
                <Animated.Text
                    numberOfLines={1}
                    style={[styles.label, { color: iconColor }, labelStyle]}
                >
                    {label}
                </Animated.Text>
            </View>
        </AnimatedPressable>
    );
});
TabButton.displayName = 'DeliveryTabButton';

function DeliveryTabBar() {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { t } = useDeliveryT();
    const isRTL = useRTL();

    const barWidth = Math.min(width - 24, 420);
    const ordered = isRTL ? [...tabs].reverse() : tabs;

    return (
        <View
            pointerEvents="box-none"
            style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 8 }]}
        >
            <View style={[styles.bar, { width: barWidth }]}>
                {ordered.map((tab) => (
                    <TabButton
                        key={tab.key}
                        tab={tab}
                        active={tab.activePath(pathname)}
                        label={t(`tabs.${tab.key}`)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 30,
    },
    bar: {
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.softSurface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.78)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        ...shadows.card,
    },
    tabButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 22,
        position: 'relative',
        overflow: 'hidden',
    },
    iconRowActive: {
        paddingHorizontal: 16,
    },
    activeBubble: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
        backgroundColor: colors.primary,
    },
    label: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 12,
        overflow: 'hidden',
    },
});

export default memo(DeliveryTabBar);
