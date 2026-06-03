import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useHomeT } from "@/hooks/useAppTranslation";
import { useCartStore } from "@/store/useCartStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useRestaurantDetails } from "../hooks/useRestaurantDetails";
import { useRestaurantMenus } from "../hooks/useRestaurantMenus";
import { useMenuSections } from "../hooks/useMenuSections";
import { useIsFavorite } from "../hooks/useFavorites";
import { useToggleFavorite } from "../hooks/useToggleFavorite";
import { useMyRestaurantRating } from "../hooks/useMyRestaurantRating";
import RestaurantRatingSheet from "../components/RestaurantRatingSheet";
import { RestaurantDetails } from "../entities/RestaurantDetails";
import { formatCuisineType, imageSource } from "../utils/foodImages";
import { getCategoryLabel, getCategoryMeta } from "../utils/categoryMeta";
import DetailsHeroSkeleton from "../components/DetailsHeroSkeleton";
import ListErrorState from "../components/ListErrorState";
import MenuTabs from "../components/MenuTabs";
import MealsList from "../components/MealsList";
import FavoriteButton from "../components/FavoriteButton";
import StarRating from "../components/StarRating";
import CategoryChips, { ChipItem } from "../components/CategoryChips";

const COVER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const HERO_HEIGHT = 300;
const STICKY_FADE_START = HERO_HEIGHT - 150;
const STICKY_FADE_END = HERO_HEIGHT - 80;

const formatAddress = (restaurant: RestaurantDetails) => {
  if (restaurant.address) return restaurant.address;
  const parts = [restaurant.street, restaurant.city].filter(Boolean);
  return parts.length ? parts.join(", ") : restaurant.city;
};

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

// ── Small presentational helpers ──────────────────────────────────────────────

function MetaPill({
  icon,
  value,
  label,
  tint,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tint?: string;
  isRTL: boolean;
}) {
  return (
    <View style={[styles.metaPill, isRTL && styles.rowReverse]}>
      <View style={[styles.metaPillIcon, tint ? { backgroundColor: `${tint}1A` } : null]}>
        <Ionicons name={icon} size={15} color={tint ?? colors.primary} />
      </View>
      <View>
        <Text style={[styles.metaPillValue, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.metaPillLabel, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isRTL: boolean;
}) {
  const textAlign = isRTL ? "right" : "left";
  return (
    <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { textAlign }]}>{label}</Text>
        <Text style={[styles.infoValue, { textAlign }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const RestaurantDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useHomeT();
  const insets = useSafeAreaInsets();
  const addCartItem = useCartStore((state) => state.addItem);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const language = useLanguageStore((s) => s.language);
  const isArabic = language === "ar";
  const currency = t("price.currency");
  const textAlign = isRTL ? "right" : "left";

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [ratingSheetOpen, setRatingSheetOpen] = useState(false);

  const scrollY = useSharedValue(0);
  // Y position (within the scroll content) where the menu chips begin.
  const menuAnchorY = useSharedValue(99999);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useRestaurantDetails(id);

  const {
    menus,
    selectedMenuId,
    selectMenu,
    isLoading: menusLoading,
    isError: menusError,
    refetch: refetchMenus,
  } = useRestaurantMenus(id);

  const favorited = useIsFavorite(id);
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: myRating } = useMyRestaurantRating(id);

  const handleToggleFavorite = useCallback(() => {
    if (!data) return;
    toggleFavorite(data);
  }, [data, toggleFavorite]);

  const {
    data: sections = [],
    isLoading: sectionsLoading,
    isError: sectionsError,
    refetch: refetchSections,
  } = useMenuSections(id, selectedMenuId ?? undefined);

  useEffect(() => {
    if (!sections.length) {
      setSelectedSectionId(null);
      return;
    }
    const stillExists = sections.some((section) => section.id === selectedSectionId);
    if (!stillExists) {
      setSelectedSectionId(sections[0].id);
    }
  }, [sections, selectedSectionId]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/restaurants" as never);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchMenus();
    refetchSections();
  }, [refetch, refetchMenus, refetchSections]);

  const address = useMemo(() => (data ? formatAddress(data) : ""), [data]);
  const activeSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const sectionChips = useMemo<ChipItem[]>(
    () => sections.map((s) => ({ id: s.id, label: s.name, count: s.meals.length })),
    [sections],
  );

  // ── Animations ────────────────────────────────────────────────────────────
  // Cover parallax: zooms when over-scrolling down, drifts up on scroll.
  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(scrollY.value, [-HERO_HEIGHT, 0], [2, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  // Compact sticky header fades in as the hero scrolls away.
  const stickyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [STICKY_FADE_START, STICKY_FADE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [STICKY_FADE_START, STICKY_FADE_END],
          [-10, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // The top overlay back/fav row fades OUT as the sticky header takes over.
  const overlayControlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [STICKY_FADE_START, STICKY_FADE_END],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Sticky category bar appears once the menu chips reach the header.
  const headerOffset = insets.top + 52;
  const stickyChipsStyle = useAnimatedStyle(() => {
    const pinPoint = menuAnchorY.value - headerOffset;
    const show = scrollY.value >= pinPoint ? 1 : 0;
    return {
      opacity: show,
      transform: [{ translateY: show ? 0 : -12 }],
    };
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.loadingTopBar}>
          <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </AnimatedPressable>
        </View>
        <DetailsHeroSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.loadingTopBar}>
          <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </AnimatedPressable>
        </View>
        <ListErrorState
          title={t("details.loadError")}
          message={error?.message ?? t("details.loadErrorMessage")}
          onRetry={refetch}
          loading={isRefetching}
        />
      </SafeAreaView>
    );
  }

  const {
    name,
    coverUrl,
    logoUrl,
    cuisineType,
    rating,
    totalRatings,
    minOrderAmount,
    isOpen,
    description,
    phone,
    deliveryFee,
    estimatedDeliveryTime,
    openingHours,
  } = data;

  const meta = getCategoryMeta(cuisineType);
  const cuisineLabel = cuisineType
    ? getCategoryLabel(cuisineType, isArabic)
    : formatCuisineType(cuisineType);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Parallax cover sits behind the scroll view. */}
      <Animated.View style={[styles.coverLayer, coverStyle]}>
        <Image
          source={imageSource(coverUrl, cuisineType)}
          placeholder={COVER_BLURHASH}
          contentFit="cover"
          transition={250}
          style={styles.cover}
        />
        <LinearGradient
          colors={["rgba(15,15,15,0.42)", "rgba(15,15,15,0.04)", "rgba(15,15,15,0.62)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.onPrimary}
            colors={[colors.primary]}
            progressViewOffset={60}
          />
        }
      >
        {/* Hero zone — back + the single favourite control overlaid on the cover. */}
        <View style={styles.heroSpacer}>
          <SafeAreaView edges={["top"]} pointerEvents="box-none">
            <Animated.View
              style={[styles.topBarOverlay, isRTL && styles.rowReverse, overlayControlsStyle]}
              pointerEvents="box-none"
            >
              <AnimatedPressable onPress={handleBack} scaleTo={0.88} style={styles.overlayIconButton}>
                <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onPrimary} />
              </AnimatedPressable>

              {/* THE single favourite button — premium burst micro-interaction. */}
              <FavoriteButton
                favorited={favorited}
                onToggle={handleToggleFavorite}
                variant="overlay"
              />
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* Body sheet overlaps the hero with a rounded top. */}
        <View style={styles.sheet}>
          {/* Logo floats half over the cover; name + meta sit safely on the sheet. */}
          <View style={[styles.identityRow, isRTL && styles.rowReverse]}>
            <View style={styles.logoWrap}>
              <Image
                source={imageSource(logoUrl, cuisineType)}
                contentFit="cover"
                transition={150}
                style={styles.logo}
              />
            </View>
            <View style={[styles.statusPill, isOpen ? styles.openStatus : styles.closedStatus]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {isOpen ? t("restaurant.openNow") : t("restaurant.closedNow")}
              </Text>
            </View>
          </View>

          {/* Restaurant name — always on the sheet, full width, never overlapped. */}
          <View style={styles.titleBlock}>
            <Text style={[styles.name, { textAlign }]} numberOfLines={2}>
              {name}
            </Text>
            <View style={[styles.cuisineRow, isRTL && styles.rowReverse]}>
              <View style={[styles.cuisineChip, { backgroundColor: `${meta.gradient[1]}1A` }]}>
                <Text style={styles.cuisineEmoji}>{meta.emoji}</Text>
                <Text style={[styles.cuisineText, { color: meta.gradient[1] }]} numberOfLines={1}>
                  {cuisineLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Premium rating block + rate CTA */}
          <View style={[styles.ratingCard, isRTL && styles.rowReverse]}>
            <StarRating
              rating={rating}
              caption={t("details.reviewsCount", { count: totalRatings })}
              starSize={16}
              align={isRTL ? "flex-end" : "flex-start"}
            />
            <AnimatedPressable
              onPress={() => setRatingSheetOpen(true)}
              style={[styles.rateBtn, isRTL && styles.rowReverse, myRating ? styles.rateBtnRated : null]}
              scaleTo={0.95}
              haptic="impact"
            >
              <Ionicons
                name={myRating ? "checkmark-circle" : "star"}
                size={15}
                color={myRating ? "#16A34A" : colors.onPrimary}
              />
              <Text style={[styles.rateBtnText, myRating ? styles.rateBtnTextRated : null]}>
                {myRating
                  ? t("details.rated", { defaultValue: "Rated" })
                  : t("details.rate", { defaultValue: "Rate" })}
              </Text>
            </AnimatedPressable>
          </View>

          {/* Horizontal meta pills */}
          <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
            <MetaPill
              icon="bag-handle-outline"
              value={formatPrice(minOrderAmount, currency)}
              label={t("details.minOrder")}
              isRTL={isRTL}
            />
            {estimatedDeliveryTime != null ? (
              <MetaPill
                icon="time-outline"
                value={t("details.etaValue", { min: estimatedDeliveryTime })}
                label={t("details.eta")}
                tint="#2563EB"
                isRTL={isRTL}
              />
            ) : null}
            {deliveryFee != null ? (
              <MetaPill
                icon="bicycle-outline"
                value={formatPrice(deliveryFee, currency)}
                label={t("details.deliveryFee")}
                tint="#16A34A"
                isRTL={isRTL}
              />
            ) : null}
          </View>

          {description ? (
            <View style={styles.block}>
              <View style={[styles.blockTitleRow, isRTL && styles.rowReverse]}>
                <View style={styles.blockAccent} />
                <Text style={[styles.blockTitle, { textAlign }]}>{t("details.about")}</Text>
              </View>
              <Text style={[styles.description, { textAlign }]}>{description}</Text>
            </View>
          ) : null}

          {/* Menu */}
          <View style={styles.menuBlock}>
            <View style={[styles.blockTitleRow, styles.blockTitleInset, isRTL && styles.rowReverse]}>
              <View style={styles.blockAccent} />
              <Text style={[styles.blockTitle, { textAlign }]}>{t("details.menu")}</Text>
            </View>
            <MenuTabs
              menus={menus}
              selectedMenuId={selectedMenuId}
              onSelect={selectMenu}
              isLoading={menusLoading}
              isError={menusError}
              onRetry={refetchMenus}
            />
            {/* Anchor: when this rail reaches the header, the sticky bar pins. */}
            <View
              onLayout={(e) => {
                menuAnchorY.value = e.nativeEvent.layout.y;
              }}
            >
              <CategoryChips
                items={sectionChips}
                selectedId={selectedSectionId}
                onSelect={setSelectedSectionId}
                isLoading={sectionsLoading}
                isRTL={isRTL}
              />
            </View>
          </View>

          <MealsList
            sections={activeSection ? [activeSection] : []}
            isLoading={sectionsLoading}
            isError={sectionsError}
            onRetry={refetchSections}
            onAddToCart={addCartItem}
            restaurantId={id}
            restaurantName={name}
            currency={currency}
            showSectionHeaders={false}
          />

          {/* Information */}
          <View style={styles.infoSection}>
            <View style={[styles.blockTitleRow, isRTL && styles.rowReverse]}>
              <View style={styles.blockAccent} />
              <Text style={[styles.blockTitle, { textAlign }]}>{t("details.information")}</Text>
            </View>
            <View style={styles.infoCard}>
              <InfoRow icon="location-outline" label={t("details.address")} value={address} isRTL={isRTL} />
              <View style={styles.infoDivider} />
              <InfoRow
                icon={isOpen ? "checkmark-circle-outline" : "close-circle-outline"}
                label={t("details.status")}
                value={isOpen ? t("restaurant.openNow") : t("restaurant.closedNow")}
                isRTL={isRTL}
              />
              {openingHours ? (
                <>
                  <View style={styles.infoDivider} />
                  <InfoRow icon="time-outline" label={t("details.hours")} value={openingHours} isRTL={isRTL} />
                </>
              ) : null}
              {phone ? (
                <>
                  <View style={styles.infoDivider} />
                  <InfoRow icon="call-outline" label={t("details.phone")} value={phone} isRTL={isRTL} />
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Compact sticky header — fades in on scroll. Holds back + favourite. */}
      <Animated.View style={[styles.stickyHeader, stickyStyle]} pointerEvents="box-none">
        <SafeAreaView edges={["top"]} style={styles.stickyInner}>
          <View style={[styles.stickyRow, isRTL && styles.rowReverse]}>
            <AnimatedPressable onPress={handleBack} scaleTo={0.88} style={styles.stickyBackBtn}>
              <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={colors.onSurface} />
            </AnimatedPressable>
            <Text style={[styles.stickyTitle, { textAlign }]} numberOfLines={1}>
              {name}
            </Text>
            <FavoriteButton
              favorited={favorited}
              onToggle={handleToggleFavorite}
              variant="plain"
              size={20}
            />
          </View>

          {/* Sticky category chips pin under the header for the menu zone. */}
          <Animated.View style={[styles.stickyChips, stickyChipsStyle]} pointerEvents="box-none">
            <CategoryChips
              items={sectionChips}
              selectedId={selectedSectionId}
              onSelect={setSelectedSectionId}
              isRTL={isRTL}
              compact
            />
          </Animated.View>
        </SafeAreaView>
      </Animated.View>

      <RestaurantRatingSheet
        visible={ratingSheetOpen}
        restaurantId={id}
        restaurantName={name}
        isRTL={isRTL}
        initialRating={myRating?.rating}
        initialComment={myRating?.comment}
        onClose={() => setRatingSheetOpen(false)}
      />

      <FloatingTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  loadingTopBar: {
    paddingHorizontal: screen.horizontal,
    paddingVertical: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  scroll: {
    paddingBottom: screen.bottomTabSpace + 20,
  },
  coverLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT + 40,
    backgroundColor: colors.surfaceContainerHighest,
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  heroSpacer: {
    height: HERO_HEIGHT,
  },
  topBarOverlay: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overlayIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(20,20,20,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: -30,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  identityRow: {
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: -54,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.card,
    padding: 4,
    ...shadows.card,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  titleBlock: {
    paddingHorizontal: screen.horizontal,
    gap: 9,
    marginTop: -4,
  },
  name: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 23,
    lineHeight: 30,
  },
  cuisineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cuisineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  cuisineEmoji: {
    fontSize: 12,
  },
  cuisineText: {
    fontFamily: typography.bodyBold,
    fontSize: 11,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  openStatus: {
    backgroundColor: "rgba(22,163,74,0.92)",
  },
  closedStatus: {
    backgroundColor: "rgba(82,82,82,0.92)",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.onPrimary,
  },
  statusText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 10,
  },

  // Premium rating card
  ratingCard: {
    marginHorizontal: screen.horizontal,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.soft,
  },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  rateBtnRated: {
    backgroundColor: "#F0FDF4",
    shadowOpacity: 0,
    elevation: 0,
  },
  rateBtnText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 13,
  },
  rateBtnTextRated: {
    color: "#16A34A",
  },

  // Meta pills
  metaRow: {
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    flexGrow: 1,
    flexBasis: "30%",
  },
  metaPillIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  metaPillValue: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 13,
  },
  metaPillLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 10.5,
  },

  block: {
    paddingHorizontal: screen.horizontal,
    gap: 9,
  },
  blockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  blockTitleInset: {
    paddingHorizontal: screen.horizontal,
  },
  blockAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  blockTitle: {
    flexShrink: 1,
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 18,
  },
  description: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 21,
  },
  menuBlock: {
    paddingTop: 4,
    gap: 12,
  },

  infoSection: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 12,
    gap: 11,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 4,
    ...shadows.soft,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: colors.outline,
    fontFamily: typography.body,
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    color: colors.onSurface,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 14,
  },

  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    ...shadows.soft,
  },
  stickyInner: {
    paddingBottom: 8,
  },
  stickyRow: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stickyBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyTitle: {
    flex: 1,
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 16,
  },
  stickyChips: {
    paddingTop: 6,
  },
});

export default RestaurantDetailsScreen;
