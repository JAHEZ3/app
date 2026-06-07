import React, { memo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import FilterChips from "./FilterChips";
import type { FilterKey, SortKey } from "../../hooks/useRestaurantsDiscovery";

const SORT_LABELS: Record<SortKey, { en: string; ar: string }> = {
  recommended: { en: "Recommended", ar: "موصى به" },
  rating: { en: "Top Rated", ar: "الأعلى" },
  popular: { en: "Popular", ar: "رواجاً" },
  newest: { en: "Newest", ar: "الأحدث" },
  minOrder: { en: "Min Order", ar: "أقل حد" },
};

function DiscoveryHeaderBase({
  scrollY,
  total,
  search,
  onSearchChange,
  filter,
  filterCounts,
  onFilterChange,
  sort,
  onOpenSort,
}: {
  scrollY: SharedValue<number>;
  total: number;
  search: string;
  onSearchChange: (v: string) => void;
  filter: FilterKey;
  filterCounts: Record<string, number>;
  onFilterChange: (k: FilterKey) => void;
  sort: SortKey;
  onOpenSort: () => void;
}) {
  const { isRTL } = useLanguageStore();
  const dir = isRTL ? "rtl" : "ltr";
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  // The big title block collapses (height + opacity) as the user scrolls.
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 46], [1, 0], Extrapolation.CLAMP),
    height: interpolate(scrollY.value, [0, 46], [40, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 46], [0, -10], Extrapolation.CLAMP) }],
  }));

  // Compact inline title fades IN as the big one collapses.
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
  }));

  const searchStyle = useAnimatedStyle(() => ({
    borderColor: focus.value
      ? colors.primary
      : "#ECECEC",
    transform: [{ scale: 1 + focus.value * 0.008 }],
  }));

  const handleFocus = () => {
    setFocused(true);
    focus.value = withTiming(1, { duration: 160 });
  };
  const handleBlur = () => {
    setFocused(false);
    focus.value = withTiming(0, { duration: 160 });
  };

  return (
    <View style={styles.wrap}>
      {/* Top bar: back + (collapsing) title + sort */}
      <View style={[styles.topBar, isRTL && styles.rowReverse]}>
        <AnimatedPressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home/Home" as never))}
          style={styles.iconBtn}
          scaleTo={0.9}
          haptic="selection"
        >
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
        </AnimatedPressable>

        <View style={styles.titleArea}>
          <Animated.View style={[styles.compactTitleRow, compactStyle, isRTL && styles.rowReverse]} pointerEvents="none">
            <Text style={[styles.compactTitle, { writingDirection: dir }]} numberOfLines={1}>
              {isRTL ? "المطاعم" : "Restaurants"}
            </Text>
            {total > 0 ? (
              <Text style={styles.compactCount}>· {total}</Text>
            ) : null}
          </Animated.View>
        </View>

        <AnimatedPressable
          onPress={onOpenSort}
          style={[styles.sortBtn, isRTL && styles.rowReverse]}
          scaleTo={0.94}
          haptic="selection"
        >
          <Ionicons name="swap-vertical" size={15} color={colors.primary} />
          <Text style={styles.sortBtnText} numberOfLines={1}>
            {isRTL ? SORT_LABELS[sort].ar : SORT_LABELS[sort].en}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Big collapsing title */}
      <Animated.View style={[styles.bigTitleWrap, titleStyle]} pointerEvents="none">
        <Text style={[styles.eyebrow, { writingDirection: dir }]}>
          {isRTL ? "اكتشف" : "Discover"}
        </Text>
        <View style={[styles.bigTitleRow, isRTL && styles.rowReverse]}>
          <Text style={[styles.bigTitle, { writingDirection: dir }]}>
            {isRTL ? "المطاعم" : "Restaurants"}
          </Text>
          {total > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{total}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Animated.View style={[styles.search, searchStyle, isRTL && styles.rowReverse]}>
          <Ionicons name="search" size={18} color={focused ? colors.primary : colors.outline} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isRTL ? "ابحث عن مطعم أو مطبخ..." : "Search restaurants or cuisines..."}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { textAlign: isRTL ? "right" : "left", writingDirection: dir }]}
            returnKeyType="search"
            selectionColor={colors.primary}
          />
          {search.length > 0 ? (
            <AnimatedPressable onPress={() => onSearchChange("")} scaleTo={0.85} haptic="selection" style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.outline} />
            </AnimatedPressable>
          ) : null}
        </Animated.View>
      </View>

      {/* Filter chips */}
      <View style={styles.chipsRow}>
        <FilterChips value={filter} counts={filterCounts} onChange={onFilterChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  wrap: {
    backgroundColor: colors.surface,
    paddingTop: 6,
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: screen.horizontal,
    height: 46,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  titleArea: { flex: 1, height: 42, justifyContent: "center" },
  compactTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  compactTitle: { fontFamily: typography.headline, color: colors.onSurface, fontSize: 18 },
  compactCount: { fontFamily: typography.bodyBold, color: colors.outline, fontSize: 14 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
    maxWidth: 150,
  },
  sortBtnText: { fontFamily: typography.bodyBold, color: colors.primary, fontSize: 12.5 },

  bigTitleWrap: {
    paddingHorizontal: screen.horizontal,
    overflow: "hidden",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bigTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bigTitle: { fontFamily: typography.headline, color: colors.onSurface, fontSize: 27, lineHeight: 33 },
  countBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontFamily: typography.bodyBold, color: colors.primary, fontSize: 12.5 },

  searchRow: { paddingHorizontal: screen.horizontal, paddingTop: 12, paddingBottom: 12 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    paddingHorizontal: 15,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    color: colors.onSurface,
    fontSize: 14.5,
    padding: 0,
  },
  clearBtn: { padding: 2 },
  chipsRow: {},
});

export default memo(DiscoveryHeaderBase);
