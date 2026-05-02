import React, { memo, useCallback, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { Menu } from "../entities/Menu";

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
    <AnimatedPressable
      onPress={handlePress}
      style={[styles.tab, selected && styles.tabSelected]}
      scaleTo={0.95}
    >
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={1}>
        {menu.name}
      </Text>
      <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
        <Text style={[styles.countText, selected && styles.countTextSelected]}>
          {menu.mealCount}
        </Text>
      </View>
    </AnimatedPressable>
  );
});
MenuTabItem.displayName = "MenuTabItem";

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
    if (typeof x === "number") {
      scrollRef.current?.scrollTo({ x: Math.max(x - 18, 0), animated: true });
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
          <SkeletonTab width={112} />
          <SkeletonTab width={138} />
          <SkeletonTab width={96} />
        </ScrollView>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.wrap, styles.errorWrap]}>
        <Text style={styles.errorText}>Could not load menus.</Text>
        {onRetry ? (
          <AnimatedPressable onPress={onRetry} style={styles.retryBtn}>
            <Ionicons name="refresh" size={14} color={colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    );
  }

  if (!menus.length) {
    return (
      <View style={[styles.wrap, styles.emptyWrap]}>
        <Ionicons name="book-outline" size={16} color={colors.outline} />
        <Text style={styles.emptyText}>No menus available yet.</Text>
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
            onLayout={(event) => {
              offsetsRef.current[menu.id] = event.nativeEvent.layout.x;
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
  wrap: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: screen.horizontal,
  },
  tab: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  tabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  tabLabel: {
    maxWidth: 150,
    color: colors.onSurface,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
  tabLabelSelected: {
    color: colors.onPrimary,
  },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  countText: {
    color: colors.outline,
    fontFamily: typography.bodyBold,
    fontSize: 11,
  },
  countTextSelected: {
    color: colors.onPrimary,
  },
  skeletonTab: {
    height: 42,
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.surfaceContainerHighest,
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: screen.horizontal,
  },
  errorText: {
    color: colors.outline,
    fontFamily: typography.bodyMedium,
    fontSize: 12,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
  },
  retryText: {
    color: colors.primary,
    fontFamily: typography.bodyBold,
    fontSize: 12,
  },
  emptyWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: screen.horizontal,
  },
  emptyText: {
    color: colors.outline,
    fontFamily: typography.body,
    fontSize: 12,
  },
});

export default memo(MenuTabs);
