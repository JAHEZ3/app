import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
    ScrollView,
    Pressable,
    View,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { Menu } from '../entities/Menu';

interface MenuTabsProps {
    menus: Menu[];
    selectedMenuId: string | null;
    onSelect: (id: string) => void;
    isLoading?: boolean;
    isError?: boolean;
    onRetry?: () => void;
}

interface MenuTabItemProps {
    menu: Menu;
    selected: boolean;
    onPress: (id: string) => void;
}

const MenuTabItem = memo(({ menu, selected, onPress }: MenuTabItemProps) => {
    const handlePress = useCallback(() => onPress(menu.id), [onPress, menu.id]);
    return (
        <Pressable
            onPress={handlePress}
            android_ripple={{ color: 'rgba(245,89,5,0.12)', borderless: false }}
            style={({ pressed }) => [
                styles.tab,
                selected && styles.tabSelected,
                pressed && !selected && { opacity: 0.85 },
            ]}
        >
            <AppText
                variant="body-md"
                align="left"
                style={[styles.tabLabel, selected && styles.tabLabelSelected]}
                numberOfLines={1}
            >
                {menu.name}
            </AppText>
            <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
                <AppText
                    variant="body-sm"
                    align="left"
                    style={[styles.countText, selected && styles.countTextSelected]}
                >
                    {menu.mealCount}
                </AppText>
            </View>
        </Pressable>
    );
});
MenuTabItem.displayName = 'MenuTabItem';

const SkeletonTab = ({ width }: { width: number }) => (
    <View style={[styles.tab, styles.skeletonTab, { width }]} />
);

const MenuTabs = ({
    menus,
    selectedMenuId,
    onSelect,
    isLoading,
    isError,
    onRetry,
}: MenuTabsProps) => {
    const scrollRef = useRef<ScrollView>(null);
    const offsetsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!selectedMenuId) return;
        const x = offsetsRef.current[selectedMenuId];
        if (typeof x === 'number') {
            scrollRef.current?.scrollTo({ x: Math.max(x - 16, 0), animated: true });
        }
    }, [selectedMenuId]);

    if (isLoading) {
        return (
            <View style={styles.wrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.row}
                >
                    <SkeletonTab width={120} />
                    <SkeletonTab width={140} />
                    <SkeletonTab width={100} />
                    <SkeletonTab width={130} />
                </ScrollView>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={[styles.wrap, styles.errorWrap]}>
                <AppText variant="body-sm" align="left" style={styles.errorText}>
                    Couldn’t load menus.
                </AppText>
                {onRetry && (
                    <Pressable onPress={onRetry} style={styles.retryBtn} hitSlop={8}>
                        <Ionicons name="refresh" size={14} color="#F55905" />
                        <AppText variant="body-sm" align="left" style={styles.retryText}>
                            Retry
                        </AppText>
                    </Pressable>
                )}
            </View>
        );
    }

    if (!menus.length) {
        return (
            <View style={[styles.wrap, styles.emptyWrap]}>
                <Ionicons name="book-outline" size={16} color="#94A3B8" />
                <AppText variant="body-sm" align="left" style={styles.emptyText}>
                    No menus available yet.
                </AppText>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {menus.map((menu) => (
                    <View
                        key={menu.id}
                        onLayout={(e) => {
                            offsetsRef.current[menu.id] = e.nativeEvent.layout.x;
                        }}
                    >
                        <MenuTabItem
                            menu={menu}
                            selected={menu.id === selectedMenuId}
                            onPress={onSelect}
                        />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: { paddingVertical: 4 },
    row: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tabSelected: {
        backgroundColor: '#F55905',
        borderColor: '#F55905',
        shadowColor: '#F55905',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    tabLabel: { color: '#0F172A', fontWeight: '600', fontSize: 13 },
    tabLabelSelected: { color: '#fff' },
    countBadge: {
        minWidth: 22,
        paddingHorizontal: 6,
        height: 20,
        borderRadius: 999,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBadgeSelected: { backgroundColor: 'rgba(255,255,255,0.25)' },
    countText: { color: '#475569', fontSize: 11, fontWeight: '700' },
    countTextSelected: { color: '#fff' },

    skeletonTab: {
        height: 38,
        backgroundColor: '#E5E7EB',
        borderColor: '#E5E7EB',
    },

    errorWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    errorText: { color: '#6B7280' },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    retryText: { color: '#F55905', fontWeight: '700' },

    emptyWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
    },
    emptyText: { color: '#94A3B8' },
});

export default memo(MenuTabs);
