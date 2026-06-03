import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { useFavorites } from "../hooks/useFavorites";
import { useToggleFavorite } from "../hooks/useToggleFavorite";
import { useRateRestaurant } from "../hooks/useRateRestaurant";
import { RestaurantDetails } from "../entities/RestaurantDetails";
import { MenuSection } from "../entities/MenuSection";
import { formatCuisineType, imageSource } from "../utils/foodImages";
import { getCategoryLabel, getCategoryMeta } from "../utils/categoryMeta";
import DetailsHeroSkeleton from "../components/DetailsHeroSkeleton";
import ListErrorState from "../components/ListErrorState";
import MenuTabs from "../components/MenuTabs";
import MealsList from "../components/MealsList";
import RestaurantRatingDialog from "../components/RestaurantRatingDialog";

const COVER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const HERO_HEIGHT = 290;

const formatAddress = (restaurant: RestaurantDetails) => {
  if (restaurant.address) return restaurant.address;
  const parts = [restaurant.street, restaurant.city].filter(Boolean);
  return parts.length ? parts.join(", ") : restaurant.city;
};

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

function StatCell({
  icon,
  label,
  value,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <View style={styles.statCell}>
      <Ionicons name={icon} size={18} color={tint ?? colors.primary} />
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SectionTabs({
  sections,
  selectedSectionId,
  onSelect,
  isLoading,
  isRTL,
}: {
  sections: MenuSection[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  isRTL: boolean;
}) {
  if (isLoading) {
    return (
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionTabsRow}
      >
        {[112, 94, 128].map((width) => (
          <View key={width} style={[styles.sectionTabSkeleton, { width }]} />
        ))}
      </Animated.ScrollView>
    );
  }

  if (!sections.length) return null;

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.sectionTabsRow, isRTL && styles.rowReverse]}
    >
      {sections.map((section) => {
        const selected = section.id === selectedSectionId;
        return (
          <AnimatedPressable
            key={section.id}
            onPress={() => onSelect(section.id)}
            scaleTo={0.95}
            style={[
              styles.sectionTab,
              isRTL && styles.rowReverse,
              selected && styles.sectionTabSelected,
            ]}
          >
            <Text
              style={[styles.sectionTabText, selected && styles.sectionTabTextSelected]}
              numberOfLines={1}
            >
              {section.name}
            </Text>
            <View style={[styles.sectionCount, selected && styles.sectionCountSelected]}>
              <Text style={[styles.sectionCountText, selected && styles.sectionCountTextSelected]}>
                {section.meals.length}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </Animated.ScrollView>
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
  const addCartItem = useCartStore((state) => state.addItem);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const language = useLanguageStore((s) => s.language);
  const isArabic = language === "ar";
  const currency = t("price.currency");
  const textAlign = isRTL ? "right" : "left";

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [ratingDialogVisible, setRatingDialogVisible] = useState(false);
  const [ratedSuccessfully, setRatedSuccessfully] = useState(false);

  const scrollY = useSharedValue(0);
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

  const { isFavorite } = useFavorites();
  const { mutate: toggleFavorite, isPending: isTogglingFavorite } = useToggleFavorite();
  const { mutate: rateRestaurant, isPending: isRatingLoading } = useRateRestaurant();

  const favorited = id ? isFavorite(id) : false;

  const handleToggleFavorite = useCallback(() => {
    if (!id) return;
    toggleFavorite({ restaurantId: id, isFavorite: favorited });
  }, [id, favorited, toggleFavorite]);

  const handleRateSubmit = useCallback(
    (rating: number, comment?: string) => {
      if (!id) return;
      rateRestaurant(
        { restaurantId: id, rating, comment },
        {
          onSuccess: () => {
            setRatingDialogVisible(false);
            setRatedSuccessfully(true);
          },
          onError: () => {
            Alert.alert(t("favorite.errorTitle"), t("favorite.ratingError"));
          },
        },
      );
    },
    [id, rateRestaurant, t],
  );

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
      [HERO_HEIGHT - 140, HERO_HEIGHT - 80],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [HERO_HEIGHT - 140, HERO_HEIGHT - 80],
          [-8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

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
          colors={["rgba(20,20,20,0.34)", "rgba(20,20,20,0.05)", "rgba(20,20,20,0.55)"]}
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
        {/* Spacer the height of the hero so content starts below it. */}
        <View style={styles.heroSpacer}>
          <SafeAreaView edges={["top"]} pointerEvents="box-none">
            <View style={[styles.topBarOverlay, isRTL && styles.rowReverse]}>
              <AnimatedPressable onPress={handleBack} scaleTo={0.88} style={styles.overlayIconButton}>
                <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onPrimary} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleToggleFavorite}
                style={[styles.overlayIconButton, favorited && styles.overlayIconButtonFav]}
                haptic="impact"
                scaleTo={0.88}
                disabled={isTogglingFavorite}
              >
                <Ionicons
                  name={favorited ? "heart" : "heart-outline"}
                  size={20}
                  color={favorited ? colors.primary : colors.onPrimary}
                />
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Body sheet overlaps the hero with a rounded top. */}
        <View style={styles.sheet}>
          <View style={[styles.identityRow, isRTL && styles.rowReverse]}>
            <View style={styles.logoWrap}>
              <Image
                source={imageSource(logoUrl, cuisineType)}
                contentFit="cover"
                transition={150}
                style={styles.logo}
              />
            </View>
            <View style={styles.identityCopy}>
              <Text style={[styles.name, { textAlign }]} numberOfLines={2}>
                {name}
              </Text>
              <View style={[styles.identityMetaRow, isRTL && styles.rowReverse]}>
                <View style={[styles.cuisineChip, { backgroundColor: `${meta.gradient[1]}1A` }]}>
                  <Text style={styles.cuisineEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.cuisineText, { color: meta.gradient[1] }]} numberOfLines={1}>
                    {cuisineLabel}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isRTL && styles.rowReverse,
                    isOpen ? styles.openStatus : styles.closedStatus,
                  ]}
                >
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {isOpen ? t("restaurant.openNow") : t("restaurant.closedNow")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Horizontal stat row */}
          <View style={[styles.statRow, isRTL && styles.rowReverse]}>
            <StatCell
              icon="star"
              tint="#E8A300"
              label={t("details.rating")}
              value={t("details.ratingCount", { rating: rating.toFixed(1), count: totalRatings })}
            />
            <View style={styles.statSeparator} />
            <StatCell
              icon="bag-handle-outline"
              label={t("details.minOrder")}
              value={formatPrice(minOrderAmount, currency)}
            />
            {estimatedDeliveryTime != null ? (
              <>
                <View style={styles.statSeparator} />
                <StatCell
                  icon="time-outline"
                  label={t("details.eta")}
                  value={t("details.etaValue", { min: estimatedDeliveryTime })}
                />
              </>
            ) : null}
          </View>

          {/* Action row */}
          <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <AnimatedPressable
              onPress={() => { setRatingDialogVisible(true); setRatedSuccessfully(false); }}
              style={[styles.actionBtn, isRTL && styles.rowReverse, ratedSuccessfully && styles.actionBtnSuccess]}
              scaleTo={0.96}
              haptic="impact"
            >
              <Ionicons
                name={ratedSuccessfully ? "checkmark-circle" : "star-outline"}
                size={16}
                color={ratedSuccessfully ? "#16A34A" : colors.primary}
              />
              <Text style={[styles.actionBtnText, ratedSuccessfully && { color: "#16A34A" }]}>
                {ratedSuccessfully ? t("details.rated") : t("details.rate")}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleToggleFavorite}
              style={[styles.actionBtn, isRTL && styles.rowReverse, favorited && styles.actionBtnFav]}
              scaleTo={0.96}
              haptic="impact"
              disabled={isTogglingFavorite}
            >
              <Ionicons
                name={favorited ? "heart" : "heart-outline"}
                size={16}
                color={favorited ? colors.primary : colors.onSurface}
              />
              <Text style={[styles.actionBtnText, favorited && { color: colors.primary }]}>
                {favorited ? t("details.saved") : t("details.save")}
              </Text>
            </AnimatedPressable>
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
            <SectionTabs
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSelect={setSelectedSectionId}
              isLoading={sectionsLoading}
              isRTL={isRTL}
            />
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
              {deliveryFee != null ? (
                <>
                  <View style={styles.infoDivider} />
                  <InfoRow icon="bicycle-outline" label={t("details.deliveryFee")} value={formatPrice(deliveryFee, currency)} isRTL={isRTL} />
                </>
              ) : null}
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

      {/* Compact sticky header — fades in on scroll */}
      <Animated.View style={[styles.stickyHeader, stickyStyle]} pointerEvents="box-none">
        <SafeAreaView edges={["top"]} style={styles.stickyInner}>
          <View style={[styles.stickyRow, isRTL && styles.rowReverse]}>
            <AnimatedPressable onPress={handleBack} scaleTo={0.88} style={styles.stickyBackBtn}>
              <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={colors.onSurface} />
            </AnimatedPressable>
            <Text style={[styles.stickyTitle, { textAlign }]} numberOfLines={1}>
              {name}
            </Text>
            <AnimatedPressable
              onPress={handleToggleFavorite}
              scaleTo={0.88}
              style={styles.stickyBackBtn}
              disabled={isTogglingFavorite}
            >
              <Ionicons
                name={favorited ? "heart" : "heart-outline"}
                size={20}
                color={favorited ? colors.primary : colors.onSurface}
              />
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      </Animated.View>

      <RestaurantRatingDialog
        visible={ratingDialogVisible}
        restaurantName={name}
        isRTL={isRTL}
        onClose={() => setRatingDialogVisible(false)}
        onSubmit={handleRateSubmit}
        isLoading={isRatingLoading}
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
    backgroundColor: "rgba(20,20,20,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayIconButtonFav: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: "rgba(245,89,5,0.2)",
  },
  sheet: {
    marginTop: -30,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 18,
  },
  identityRow: {
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    marginTop: -52,
  },
  logoWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.card,
    padding: 4,
    ...shadows.card,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  identityCopy: {
    flex: 1,
    gap: 8,
    paddingBottom: 6,
  },
  name: {
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 22,
    lineHeight: 28,
  },
  identityMetaRow: {
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
  statRow: {
    marginHorizontal: screen.horizontal,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.soft,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
  },
  statValue: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  statLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
  },
  statSeparator: {
    width: 1,
    height: 34,
    backgroundColor: colors.surfaceContainer,
  },
  actionRow: {
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: "#ECECEC",
    backgroundColor: colors.card,
    ...shadows.soft,
  },
  actionBtnFav: {
    borderColor: colors.primary,
    backgroundColor: colors.faintPrimary,
  },
  actionBtnSuccess: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  actionBtnText: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 13,
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
  sectionTabsRow: {
    paddingHorizontal: screen.horizontal,
    gap: 10,
    paddingBottom: 4,
  },
  sectionTab: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  sectionTabSelected: {
    backgroundColor: colors.onSurface,
    borderColor: colors.onSurface,
  },
  sectionTabText: {
    maxWidth: 150,
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 13,
  },
  sectionTabTextSelected: {
    color: colors.onPrimary,
  },
  sectionCount: {
    minWidth: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  sectionCountSelected: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  sectionCountText: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 10,
  },
  sectionCountTextSelected: {
    color: colors.onPrimary,
  },
  sectionTabSkeleton: {
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
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
});

export default RestaurantDetailsScreen;
