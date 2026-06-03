import React, { memo, useCallback, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";

export interface ChipItem {
  id: string;
  label: string;
  count?: number;
}

interface CategoryChipsProps {
  items: ChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isRTL?: boolean;
  /** Tighter vertical padding for the sticky/condensed variant. */
  compact?: boolean;
}

/**
 * A single horizontal chip rail used for menu-section navigation. The same
 * component renders both the inline rail and the sticky bar so the look stays
 * perfectly consistent as it pins to the top. Auto-scrolls the selected chip
 * into view.
 */
function CategoryChipsBase({
  items,
  selectedId,
  onSelect,
  isLoading = false,
  isRTL = false,
  compact = false,
}: CategoryChipsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!selectedId) return;
    const x = offsets.current[selectedId];
    if (typeof x === "number") {
      scrollRef.current?.scrollTo({ x: Math.max(x - 16, 0), animated: true });
    }
  }, [selectedId]);

  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, compact && styles.rowCompact]}
      >
        {[110, 92, 130].map((w) => (
          <View key={w} style={[styles.chipSkeleton, { width: w }]} />
        ))}
      </ScrollView>
    );
  }

  if (!items.length) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.row,
        compact && styles.rowCompact,
        isRTL && styles.rowReverse,
      ]}
    >
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <View
            key={item.id}
            onLayout={(e) => {
              offsets.current[item.id] = e.nativeEvent.layout.x;
            }}
          >
            <Chip item={item} selected={selected} isRTL={isRTL} onSelect={onSelect} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const Chip = memo(
  ({
    item,
    selected,
    isRTL,
    onSelect,
  }: {
    item: ChipItem;
    selected: boolean;
    isRTL: boolean;
    onSelect: (id: string) => void;
  }) => {
    const handlePress = useCallback(() => onSelect(item.id), [item.id, onSelect]);
    return (
      <AnimatedPressable
        onPress={handlePress}
        scaleTo={0.94}
        haptic="selection"
        style={[styles.chip, isRTL && styles.rowReverse, selected && styles.chipSelected]}
      >
        <Text
          style={[styles.chipText, selected && styles.chipTextSelected]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.count != null ? (
          <View style={[styles.badge, selected && styles.badgeSelected]}>
            <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
              {item.count}
            </Text>
          </View>
        ) : null}
      </AnimatedPressable>
    );
  },
);
Chip.displayName = "Chip";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: screen.horizontal,
    paddingVertical: 6,
  },
  rowCompact: {
    paddingVertical: 2,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  chip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 15,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  chipText: {
    maxWidth: 160,
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 13.5,
  },
  chipTextSelected: {
    color: colors.onPrimary,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSelected: {
    backgroundColor: "rgba(255,255,255,0.26)",
  },
  badgeText: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 11,
  },
  badgeTextSelected: {
    color: colors.onPrimary,
  },
  chipSkeleton: {
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
});

export default memo(CategoryChipsBase);
