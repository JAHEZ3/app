import React, { memo, useCallback, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Restaurant } from "../../entities/Restaurant";
import { useIsFavorite } from "../../hooks/useFavorites";
import { useToggleFavorite } from "../../hooks/useToggleFavorite";
import { imageSource, formatCuisineType } from "../../utils/foodImages";
import { getCategoryLabel, getCategoryMeta } from "../../utils/categoryMeta";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const CURRENCY = "ILS";

// ── Shared bits ───────────────────────────────────────────────────────────────

function RatingBadge({ rating, count, dark }: { rating: number; count: number; dark?: boolean }) {
  return (
    <View style={[styles.ratingBadge, dark && styles.ratingBadgeDark]}>
      <Ionicons name="star" size={11} color={dark ? "#FFD27A" : "#D68A00"} />
      <Text style={[styles.ratingText, dark && styles.ratingTextDark]}>{rating.toFixed(1)}</Text>
      <Text style={[styles.ratingCount, dark && styles.ratingCountDark]}>({count})</Text>
    </View>
  );
}

function HeartButton({ favorited, onPress }: { favorited: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(1.3, { damping: 5, stiffness: 320 }, () => {
      scale.value = withSpring(1, { damping: 9, stiffness: 260 });
    });
  }, [favorited, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      scaleTo={0.82}
      style={[styles.heart, favorited && styles.heartActive]}
    >
      <Animated.View style={style}>
        <Ionicons
          name={favorited ? "heart" : "heart-outline"}
          size={18}
          color={favorited ? colors.primary : "#fff"}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

function StatusPill({ open, isRTL }: { open: boolean; isRTL: boolean }) {
  return (
    <View style={[styles.statusPill, open ? styles.statusOpen : styles.statusClosed]}>
      <View style={[styles.statusDot, { backgroundColor: open ? "#22C55E" : "#9CA3AF" }]} />
      <Text style={[styles.statusText, { color: open ? "#16A34A" : "#6B7280" }]}>
        {open ? (isRTL ? "مفتوح" : "Open") : isRTL ? "مغلق" : "Closed"}
      </Text>
    </View>
  );
}

// ── Featured (hero) card ──────────────────────────────────────────────────────

export const FeaturedRestaurantCard = memo(function FeaturedRestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress: (r: Restaurant) => void;
}) {
  const { isRTL, language } = useLanguageStore();
  const dir = isRTL ? "rtl" : "ltr";
  const favorited = useIsFavorite(restaurant.id);
  const { mutate: toggleFavorite } = useToggleFavorite();
  const meta = getCategoryMeta(restaurant.cuisineType);
  const cuisineLabel = restaurant.cuisineType
    ? getCategoryLabel(restaurant.cuisineType, language === "ar")
    : formatCuisineType(restaurant.cuisineType);

  return (
    <AnimatedPressable
      onPress={() => onPress(restaurant)}
      haptic="impact"
      scaleTo={0.98}
      style={styles.featuredCard}
    >
      <View style={styles.featuredImageWrap}>
        <Image
          source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
          placeholder={BLURHASH}
          contentFit="cover"
          transition={240}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(10,10,10,0.05)", "rgba(10,10,10,0.35)", "rgba(10,10,10,0.85)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top row: featured badge + heart */}
        <View style={[styles.featuredTop, isRTL && styles.rowReverse]}>
          <View style={styles.featuredBadge}>
            <Ionicons name="ribbon" size={12} color="#fff" />
            <Text style={styles.featuredBadgeText}>{isRTL ? "مميز" : "Featured"}</Text>
          </View>
          <HeartButton favorited={favorited} onPress={() => toggleFavorite(restaurant)} />
        </View>

        {/* Bottom content */}
        <View style={styles.featuredBottom}>
          <View style={[styles.featuredChips, isRTL && styles.rowReverse]}>
            <View style={styles.cuisineChip}>
              <Text style={styles.cuisineEmoji}>{meta.emoji}</Text>
              <Text style={styles.cuisineChipText} numberOfLines={1}>{cuisineLabel}</Text>
            </View>
            <RatingBadge rating={restaurant.rating} count={restaurant.totalRatings} dark />
          </View>
          <Text style={[styles.featuredName, { writingDirection: dir }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={[styles.featuredMeta, isRTL && styles.rowReverse]}>
            <View style={[styles.metaItem, isRTL && styles.rowReverse]}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.featuredMetaText} numberOfLines={1}>{restaurant.city}</Text>
            </View>
            {restaurant.minOrderAmount > 0 ? (
              <>
                <View style={styles.metaDot} />
                <View style={[styles.metaItem, isRTL && styles.rowReverse]}>
                  <Ionicons name="bag-handle" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.featuredMetaText}>
                    {isRTL ? "الحد الأدنى" : "Min"} {restaurant.minOrderAmount.toFixed(0)} {CURRENCY}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
});

// ── Standard premium card ─────────────────────────────────────────────────────

const PremiumRestaurantCardBase = memo(function PremiumRestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress: (r: Restaurant) => void;
}) {
  const { isRTL, language } = useLanguageStore();
  const dir = isRTL ? "rtl" : "ltr";
  const favorited = useIsFavorite(restaurant.id);
  const { mutate: toggleFavorite } = useToggleFavorite();
  const meta = getCategoryMeta(restaurant.cuisineType);
  const cuisineLabel = restaurant.cuisineType
    ? getCategoryLabel(restaurant.cuisineType, language === "ar")
    : formatCuisineType(restaurant.cuisineType);

  const handleFav = useCallback(
    () => toggleFavorite(restaurant),
    [toggleFavorite, restaurant],
  );

  return (
    <AnimatedPressable
      onPress={() => onPress(restaurant)}
      haptic="impact"
      scaleTo={0.98}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        <Image
          source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
          placeholder={BLURHASH}
          contentFit="cover"
          transition={220}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.04)", "rgba(10,10,10,0.4)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.cardTop, isRTL && styles.rowReverse]}>
          <StatusPill open={restaurant.isOpen} isRTL={isRTL} />
          <HeartButton favorited={favorited} onPress={handleFav} />
        </View>
        {/* Floating logo */}
        <View style={[styles.logoWrap, isRTL && styles.logoWrapRtl]}>
          <Image
            source={imageSource(restaurant.logoUrl, restaurant.cuisineType)}
            placeholder={BLURHASH}
            contentFit="cover"
            transition={180}
            style={styles.logo}
          />
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.nameRow, isRTL && styles.rowReverse]}>
          <Text style={[styles.name, { writingDirection: dir }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <RatingBadge rating={restaurant.rating} count={restaurant.totalRatings} />
        </View>

        <View style={[styles.tagRow, isRTL && styles.rowReverse]}>
          <View style={[styles.cuisineTag, { backgroundColor: `${meta.gradient[1]}14` }]}>
            <Text style={styles.cuisineTagEmoji}>{meta.emoji}</Text>
            <Text style={[styles.cuisineTagText, { color: meta.gradient[1] }]} numberOfLines={1}>
              {cuisineLabel}
            </Text>
          </View>
          {restaurant.city ? (
            <View style={[styles.metaItem, isRTL && styles.rowReverse]}>
              <Ionicons name="location-outline" size={13} color={colors.outline} />
              <Text style={styles.cityText} numberOfLines={1}>{restaurant.city}</Text>
            </View>
          ) : null}
        </View>

        {restaurant.minOrderAmount > 0 ? (
          <View style={[styles.footer, isRTL && styles.rowReverse]}>
            <View style={styles.minPill}>
              <Ionicons name="bag-handle-outline" size={13} color={colors.primary} />
              <Text style={styles.minText}>
                {isRTL ? "الحد الأدنى" : "Min"} {restaurant.minOrderAmount.toFixed(0)} {CURRENCY}
              </Text>
            </View>
            <View style={[styles.viewCta, isRTL && styles.rowReverse]}>
              <Text style={styles.viewCtaText}>{isRTL ? "عرض" : "View"}</Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={colors.primary} />
            </View>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
});

export default PremiumRestaurantCardBase;

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },

  // Rating badge
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingBadgeDark: { backgroundColor: "rgba(0,0,0,0.42)" },
  ratingText: { fontFamily: typography.bodyBold, color: "#92400E", fontSize: 11.5 },
  ratingTextDark: { color: "#fff" },
  ratingCount: { fontFamily: typography.body, color: "#A16207", fontSize: 10 },
  ratingCountDark: { color: "rgba(255,255,255,0.8)" },

  // Heart
  heart: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(20,20,20,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartActive: {
    backgroundColor: "#fff",
    borderColor: "rgba(245,89,5,0.2)",
  },

  // Status
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusOpen: { backgroundColor: "rgba(255,255,255,0.94)" },
  statusClosed: { backgroundColor: "rgba(255,255,255,0.9)" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: typography.bodyBold, fontSize: 10.5 },

  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },

  // ── Featured card ──
  featuredCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: radii.xxl,
    overflow: "hidden",
    backgroundColor: colors.card,
    ...shadows.card,
  },
  featuredImageWrap: {
    width: "100%",
    aspectRatio: 1.55,
    justifyContent: "space-between",
    backgroundColor: colors.surfaceContainerHighest,
  },
  featuredTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    ...shadows.primary,
  },
  featuredBadgeText: { fontFamily: typography.bodyBold, color: "#fff", fontSize: 11 },
  featuredBottom: { padding: 16, gap: 7 },
  featuredChips: { flexDirection: "row", alignItems: "center", gap: 8 },
  cuisineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    maxWidth: 160,
  },
  cuisineEmoji: { fontSize: 12 },
  cuisineChipText: { fontFamily: typography.bodyBold, color: colors.onSurface, fontSize: 11 },
  featuredName: {
    fontFamily: typography.headline,
    color: "#fff",
    fontSize: 22,
    lineHeight: 28,
  },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredMetaText: { fontFamily: typography.bodyMedium, color: "rgba(255,255,255,0.9)", fontSize: 12.5 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.6)" },

  // ── Standard card ──
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.soft,
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1.9,
    backgroundColor: colors.surfaceContainerHighest,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 11,
  },
  logoWrap: {
    position: "absolute",
    bottom: -22,
    left: 16,
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 3,
    ...shadows.card,
  },
  logoWrapRtl: { left: undefined, right: 16 },
  logo: { width: "100%", height: "100%", borderRadius: 13 },
  body: { paddingHorizontal: 16, paddingTop: 30, paddingBottom: 14, gap: 9 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: { flex: 1, fontFamily: typography.headlineSemi, color: colors.onSurface, fontSize: 16.5 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cuisineTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: "60%",
  },
  cuisineTagEmoji: { fontSize: 11 },
  cuisineTagText: { fontFamily: typography.bodyBold, fontSize: 11 },
  cityText: { fontFamily: typography.body, color: colors.outline, fontSize: 12 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  minPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.faintPrimary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  minText: { fontFamily: typography.bodyBold, color: colors.primary, fontSize: 11.5 },
  viewCta: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewCtaText: { fontFamily: typography.bodyBold, color: colors.primary, fontSize: 12.5 },
});
