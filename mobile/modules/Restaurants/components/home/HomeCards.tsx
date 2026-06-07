import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { Restaurant } from "../../entities/Restaurant";
import { getCategoryMeta } from "../../utils/categoryMeta";
import { imageSource } from "../../utils/foodImages";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

// ── Top Rated: rating-forward compact card ────────────────────────────────────

export const TopRatedCard = memo(function TopRatedCard({
  restaurant,
  width,
  isRTL,
  onPress,
}: {
  restaurant: Restaurant;
  width: number;
  isRTL: boolean;
  onPress: () => void;
}) {
  const dir = isRTL ? "rtl" : "ltr";
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="impact"
      scaleTo={0.97}
      style={[styles.topCard, { width }]}
    >
      <View style={styles.topImageWrap}>
        <Image
          source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
          placeholder={BLURHASH}
          contentFit="cover"
          transition={220}
          style={styles.topImage}
        />
        <View style={styles.topRatingBadge}>
          <Ionicons name="star" size={11} color="#fff" />
          <Text style={styles.topRatingText}>{restaurant.rating.toFixed(1)}</Text>
        </View>
      </View>
      <View style={styles.topBody}>
        <Text style={[styles.topName, { writingDirection: dir }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={[styles.topMeta, { writingDirection: dir }]} numberOfLines={1}>
          {restaurant.totalRatings} {isRTL ? "تقييم" : "reviews"}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

// ── Explore Cuisines: image card with category photo + label ──────────────────

export const CuisineChip = memo(function CuisineChip({
  label,
  cuisineType,
  imageUri,
  isRTL,
  selected = false,
  variant = "cuisine",
  onPress,
}: {
  label: string;
  cuisineType?: string | null;
  /** Manager-provided category image; falls back to a cuisine placeholder. */
  imageUri?: string | null;
  isRTL: boolean;
  /** Highlights the tile when this cuisine is the active filter. */
  selected?: boolean;
  /** "all" renders the reset/All tile (no photo, a glyph instead). */
  variant?: "cuisine" | "all";
  onPress: () => void;
}) {
  const meta = getCategoryMeta(cuisineType ?? undefined);
  const dir = isRTL ? "rtl" : "ltr";
  const isAll = variant === "all";

  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      scaleTo={0.93}
      style={styles.cuisineItem}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <View
        style={[
          styles.cuisineImageWrap,
          isAll && styles.cuisineAllWrap,
          isAll && selected && styles.cuisineAllWrapActive,
          !isAll && selected && styles.cuisineImageWrapActive,
        ]}
      >
        {isAll ? (
          // "All" tile — a clean primary button: tinted when idle, filled when active.
          <View
            style={[
              styles.cuisineFallback,
              { backgroundColor: selected ? colors.primary : colors.faintPrimary },
            ]}
          >
            <Ionicons
              name="apps"
              size={28}
              color={selected ? colors.onPrimary : colors.primary}
            />
          </View>
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            placeholder={BLURHASH}
            contentFit="cover"
            transition={200}
            style={styles.cuisineImage}
          />
        ) : (
          // No category image → soft tinted disc with the cuisine emoji.
          <View style={[styles.cuisineFallback, { backgroundColor: `${meta.gradient[1]}1A` }]}>
            <Text style={styles.cuisineFallbackEmoji}>{meta.emoji}</Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.cuisineLabel,
          isAll && styles.cuisineLabelAll,
          selected && styles.cuisineLabelActive,
          { writingDirection: dir },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },

  // Top Rated
  topCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.soft,
  },
  topImageWrap: { width: "100%", aspectRatio: 1.5, backgroundColor: colors.surfaceContainerHighest },
  topImage: { width: "100%", height: "100%" },
  topRatingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(214,138,0,0.95)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  topRatingText: { fontFamily: typography.bodyBold, color: "#fff", fontSize: 11 },
  topBody: { padding: 11, gap: 2 },
  topName: { fontFamily: typography.bodyBold, color: colors.onSurface, fontSize: 14 },
  topMeta: { fontFamily: typography.body, color: colors.outline, fontSize: 11 },

  // Explore Cuisines — photo tile + label beneath
  cuisineItem: {
    width: 80,
    alignItems: "center",
    gap: 8,
  },
  cuisineImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: "transparent",
    ...shadows.soft,
  },
  cuisineImageWrapActive: {
    borderColor: colors.primary,
  },
  // "All" tile — a dashed-free, button-like primary tile.
  cuisineAllWrap: {
    borderWidth: 1.5,
    borderColor: colors.softPrimary,
    backgroundColor: colors.faintPrimary,
  },
  cuisineAllWrapActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  cuisineImage: { width: "100%", height: "100%" },
  cuisineFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cuisineFallbackEmoji: { fontSize: 28 },
  cuisineLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.onSurface,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 80,
  },
  cuisineLabelActive: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
  },
  cuisineLabelAll: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
  },
});
