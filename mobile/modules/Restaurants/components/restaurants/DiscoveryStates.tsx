import React, { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, shadows, typography } from "@/components/ui/theme";

// ── Shimmer skeleton ──────────────────────────────────────────────────────────

function Shimmer({ style }: { style?: any }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
  }, [progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 1, 0.5]),
  }));
  return <Animated.View style={[styles.shimmer, animated, style]} />;
}

function FeaturedSkeleton() {
  return (
    <View style={styles.featuredCard}>
      <Shimmer style={styles.featuredImage} />
    </View>
  );
}

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Shimmer style={styles.image} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Shimmer style={styles.titleLine} />
          <Shimmer style={styles.ratingPill} />
        </View>
        <Shimmer style={styles.tagLine} />
        <View style={styles.row}>
          <Shimmer style={styles.pill} />
          <Shimmer style={styles.pillSm} />
        </View>
      </View>
    </View>
  );
}

export const DiscoverySkeleton = memo(function DiscoverySkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <FeaturedSkeleton />
      {[0, 1, 2, 3].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
});

// ── Empty states ──────────────────────────────────────────────────────────────

export const DiscoveryEmpty = memo(function DiscoveryEmpty({
  variant,
  query,
  isRTL,
  onReset,
}: {
  variant: "noResults" | "noMatches" | "empty";
  query?: string;
  isRTL: boolean;
  onReset?: () => void;
}) {
  const dir = isRTL ? "rtl" : "ltr";

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + pulse.value * 0.16 }],
    opacity: 0.14 + pulse.value * 0.1,
  }));

  const copy = {
    noResults: {
      icon: "search-outline" as const,
      titleEn: "No results found",
      titleAr: "لا توجد نتائج",
      bodyEn: query ? `We couldn't find anything for "${query}".` : "Try a different search term.",
      bodyAr: query ? `لم نجد أي نتائج لـ "${query}".` : "جرّب كلمة بحث مختلفة.",
    },
    noMatches: {
      icon: "options-outline" as const,
      titleEn: "No matches",
      titleAr: "لا توجد مطاعم مطابقة",
      bodyEn: "No restaurants match this filter right now.",
      bodyAr: "لا توجد مطاعم تطابق هذا الفلتر حالياً.",
    },
    empty: {
      icon: "restaurant-outline" as const,
      titleEn: "No restaurants yet",
      titleAr: "لا توجد مطاعم بعد",
      bodyEn: "Pull down to refresh or check back soon.",
      bodyAr: "اسحب للأسفل للتحديث أو عُد لاحقاً.",
    },
  }[variant];

  return (
    <Animated.View entering={FadeIn.duration(380)} style={styles.emptyWrap}>
      <View style={styles.emptyIconStack}>
        <Animated.View style={[styles.emptyPulse, pulseStyle]} />
        <View style={styles.emptyIcon}>
          <Ionicons name={copy.icon} size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.emptyTitle, { writingDirection: dir }]}>
        {isRTL ? copy.titleAr : copy.titleEn}
      </Text>
      <Text style={[styles.emptyBody, { writingDirection: dir }]}>
        {isRTL ? copy.bodyAr : copy.bodyEn}
      </Text>
      {onReset ? (
        <AnimatedPressable onPress={onReset} haptic="impact" scaleTo={0.96} style={styles.resetBtn}>
          <Ionicons name="refresh" size={16} color={colors.onPrimary} />
          <Text style={styles.resetText}>{isRTL ? "إعادة التعيين" : "Clear filters"}</Text>
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  shimmer: { backgroundColor: "#E7E7E9", borderRadius: 10 },
  skeletonWrap: { paddingTop: 6 },
  featuredCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: radii.xxl,
    overflow: "hidden",
    ...shadows.soft,
  },
  featuredImage: { width: "100%", aspectRatio: 1.55, borderRadius: 0 },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.soft,
  },
  image: { width: "100%", aspectRatio: 1.9, borderRadius: 0 },
  body: { padding: 16, gap: 11 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleLine: { width: "55%", height: 17, borderRadius: 6 },
  ratingPill: { width: 52, height: 22, borderRadius: 8 },
  tagLine: { width: "40%", height: 13, borderRadius: 6 },
  pill: { width: 110, height: 26, borderRadius: 999 },
  pillSm: { width: 64, height: 20, borderRadius: 999 },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingTop: 60,
    paddingBottom: 80,
    gap: 12,
  },
  emptyIconStack: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyPulse: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 19,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  resetBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  resetText: { fontFamily: typography.bodyBold, color: colors.onPrimary, fontSize: 14 },
});
