import React, { memo, useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useHomeT } from "@/hooks/useAppTranslation";
import { useLanguageStore } from "@/store/useLanguageStore";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { PROMO_BANNERS, PromoBanner } from "../../utils/mockHomeContent";

const CARD_HEIGHT = 150;
const GAP = 12;

// ── Pagination dots ───────────────────────────────────────────────────────────

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 18 : 6);
  React.useEffect(() => {
    w.value = withTiming(active ? 18 : 6, { duration: 240 });
  }, [active, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[styles.dot, active && styles.dotActive, style]} />;
}

// ── Single promo card ─────────────────────────────────────────────────────────

const PromoCard = memo(function PromoCard({
  banner,
  width,
  isRTL,
  onPress,
}: {
  banner: PromoBanner;
  width: number;
  isRTL: boolean;
  onPress: () => void;
}) {
  const { t } = useHomeT();
  const dir = isRTL ? "rtl" : "ltr";
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="impact"
      scaleTo={0.97}
      style={[styles.cardPressable, { width }]}
    >
      <LinearGradient
        colors={banner.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isRTL && styles.cardRtl]}
      >
        {/* Decorative discs */}
        <View style={styles.discLarge} />
        <View style={styles.discSmall} />

        <View style={styles.cardBody}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t(banner.badgeKey)}</Text>
          </View>
          <Text style={[styles.title, { writingDirection: dir }]} numberOfLines={2}>
            {t(banner.titleKey)}
          </Text>
          <Text style={[styles.subtitle, { writingDirection: dir }]} numberOfLines={1}>
            {t(banner.subtitleKey)}
          </Text>
        </View>

        <View style={styles.iconWrap}>
          <Ionicons name={banner.icon as keyof typeof Ionicons.glyphMap} size={30} color="#fff" />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
});

// ── Carousel (native FlatList — reliable, no gesture conflicts) ────────────────

function PromoCarouselBase({ onPressBanner }: { onPressBanner: (b: PromoBanner) => void }) {
  const { width } = useWindowDimensions();
  const isRTL = useLanguageStore((s) => s.isRTL);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<PromoBanner>>(null);

  // One card spans the screen minus the page padding; the snap interval adds
  // the gap so paging lands exactly on each card.
  const cardWidth = width - screen.horizontal * 2;
  const snap = cardWidth + GAP;

  const renderItem = useCallback(
    ({ item }: { item: PromoBanner }) => (
      <PromoCard
        banner={item}
        width={cardWidth}
        isRTL={isRTL}
        onPress={() => onPressBanner(item)}
      />
    ),
    [cardWidth, isRTL, onPressBanner],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / snap);
      setIndex(Math.max(0, Math.min(i, PROMO_BANNERS.length - 1)));
    },
    [snap],
  );

  return (
    <View>
      <FlatList
        ref={listRef}
        data={PROMO_BANNERS}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        decelerationRate="fast"
        snapToAlignment="start"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        getItemLayout={(_, i) => ({ length: snap, offset: snap * i, index: i })}
      />
      <View style={styles.dotsRow}>
        {PROMO_BANNERS.map((b, i) => (
          <Dot key={b.id} active={i === index} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: screen.horizontal },
  cardPressable: { height: CARD_HEIGHT },
  card: {
    flex: 1,
    borderRadius: radii.xl,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...shadows.soft,
  },
  cardRtl: { flexDirection: "row-reverse" },
  discLarge: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -40,
    top: -50,
  },
  discSmall: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.1)",
    left: -28,
    bottom: -36,
  },
  cardBody: { flex: 1, gap: 6 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontFamily: typography.bodyBold,
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: typography.headline,
    color: "#fff",
    fontSize: 19,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: typography.bodyMedium,
    color: "rgba(255,255,255,0.9)",
    fontSize: 12.5,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dotActive: { backgroundColor: colors.primary },
});

export default memo(PromoCarouselBase);
