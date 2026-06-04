import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import type { FilterKey } from "../../hooks/useRestaurantsDiscovery";

interface ChipDef {
  key: FilterKey;
  labelEn: string;
  labelAr: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CHIPS: ChipDef[] = [
  { key: "all", labelEn: "All", labelAr: "الكل", icon: "apps" },
  { key: "openNow", labelEn: "Open Now", labelAr: "مفتوح الآن", icon: "time" },
  { key: "topRated", labelEn: "Top Rated", labelAr: "الأعلى تقييماً", icon: "star" },
  { key: "popular", labelEn: "Most Popular", labelAr: "الأكثر رواجاً", icon: "flame" },
  { key: "new", labelEn: "New", labelAr: "جديد", icon: "sparkles" },
];

const Chip = memo(function Chip({
  def,
  active,
  count,
  isRTL,
  onPress,
}: {
  def: ChipDef;
  active: boolean;
  count?: number;
  isRTL: boolean;
  onPress: () => void;
}) {
  const label = isRTL ? def.labelAr : def.labelEn;
  const inner = (
    <>
      <Ionicons
        name={def.icon}
        size={14}
        color={active ? colors.onPrimary : colors.primary}
      />
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
      {typeof count === "number" && count > 0 ? (
        <View style={[styles.count, active && styles.countActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active ? (
        <LinearGradient
          colors={[colors.primary, "#FF7A33"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.chip, styles.chipActive, isRTL && styles.chipRtl]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.chip, styles.chipIdle, isRTL && styles.chipRtl]}>{inner}</View>
      )}
    </AnimatedPressable>
  );
});

function FilterChipsBase({
  value,
  counts,
  onChange,
}: {
  value: FilterKey;
  counts: Record<string, number>;
  onChange: (key: FilterKey) => void;
}) {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((def) => (
        <Chip
          key={def.key}
          def={def}
          active={value === def.key}
          count={counts[def.key]}
          isRTL={isRTL}
          onPress={() => onChange(def.key)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: screen.horizontal,
    gap: 9,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
  },
  chipRtl: { flexDirection: "row-reverse" },
  chipIdle: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#ECECEC",
    ...shadows.soft,
  },
  chipActive: {
    ...shadows.primary,
  },
  label: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 12.5,
  },
  labelActive: { color: colors.onPrimary },
  count: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  countActive: { backgroundColor: "rgba(255,255,255,0.26)" },
  countText: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 10,
  },
  countTextActive: { color: colors.onPrimary },
});

export default memo(FilterChipsBase);
