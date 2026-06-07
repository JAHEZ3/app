import React, { memo, useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useHomeT } from "@/hooks/useAppTranslation";
import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import { useRestaurantHomeFeed } from "@/modules/Restaurants/hooks/useRestaurantHomeFeed";
import { useFavoriteRestaurants } from "@/modules/Restaurants/hooks/useFavoriteRestaurants";
import { useToggleFavorite } from "@/modules/Restaurants/hooks/useToggleFavorite";
import { useFavorites } from "@/modules/Restaurants/hooks/useFavorites";
import { useHomeSections } from "@/modules/Restaurants/hooks/useHomeSections";
import PromoCarousel from "@/modules/Restaurants/components/home/PromoCarousel";
import { TopRatedCard, CuisineChip } from "@/modules/Restaurants/components/home/HomeCards";
import { isNewRestaurant } from "@/modules/Restaurants/utils/mockHomeContent";
import { Meal } from "@/modules/Restaurants/entities/Meal";
import { Restaurant } from "@/modules/Restaurants/entities/Restaurant";
import MealOptionsModal from "@/modules/Restaurants/components/MealOptionsModal";
import { MealSelectionResult } from "@/modules/Restaurants/hooks/useMealOptionsSelection";
import {
  formatCuisineType,
  getFoodPlaceholderUrl,
  getMealImageSource,
  imageSource,
} from "@/modules/Restaurants/utils/foodImages";
import {
  getCategoryLabel,
  getCategoryMeta,
} from "@/modules/Restaurants/utils/categoryMeta";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useCartStore } from "@/store/useCartStore";
import { useLanguageStore } from "@/store/useLanguageStore";

const IMAGE_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

const formatPrice = (value: number, currency: string) =>
  `${value.toFixed(value % 1 === 0 ? 0 : 2)} ${currency}`;

const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function HomeHero({
  firstName,
  search,
  onSearchChange,
}: {
  firstName: string;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const { t } = useHomeT();
  const { isRTL } = useLanguageStore();
  const focus = useSharedValue(0);

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.58)"],
    ),
    transform: [{ scale: 1 + focus.value * 0.012 }],
  }));

  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroShapeLarge} />
      <View style={styles.heroShapeSmall} />

      <View style={[styles.heroTopRow, isRTL && styles.heroTopRowRtl]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroGreeting, { textAlign }]}>
            {t(`greeting.${getGreetingKey()}`)}
          </Text>
          <Text style={[styles.heroName, { textAlign }]} numberOfLines={1}>
            {firstName}
          </Text>
        </View>

        <View style={styles.heroActions}>
          <AnimatedPressable
            style={styles.heroIconButton}
            accessibilityLabel={t("accessibility.notifications")}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.onPrimary} />
          </AnimatedPressable>
        </View>
      </View>

      <View style={[styles.heroMainRow, isRTL && styles.heroMainRowRtl]}>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { textAlign }]}>{t("hero.title")}</Text>
          <Text style={[styles.heroSubtitle, { textAlign }]}>{t("hero.subtitle")}</Text>
        </View>

        <View style={styles.heroVisualWrap}>
          <View style={styles.heroVisualGlow} />
          <Image
            source={{ uri: getFoodPlaceholderUrl("healthy") }}
            placeholder={IMAGE_BLURHASH}
            contentFit="cover"
            transition={240}
            style={styles.heroVisualImage}
          />
          <View style={styles.heroVisualBadge}>
            <Ionicons name="restaurant" size={16} color={colors.primary} />
          </View>
        </View>
      </View>

      <Animated.View style={[styles.heroSearch, isRTL && styles.heroSearchRtl, searchAnimatedStyle]}>
        <Ionicons name="search" size={18} color="rgba(255,255,255,0.86)" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={t("search.placeholder")}
          placeholderTextColor="rgba(255,255,255,0.68)"
          onFocus={() => {
            focus.value = withTiming(1, { duration: 180 });
          }}
          onBlur={() => {
            focus.value = withTiming(0, { duration: 180 });
          }}
          style={[styles.heroSearchInput, { textAlign }]}
          selectionColor={colors.onPrimary}
        />
      </Animated.View>
    </View>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { isRTL } = useLanguageStore();
  const textAlign = isRTL ? "right" : "left";
  const titleDirection = isRTL ? "rtl" : "ltr";

  return (
    <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRtl]}>
      <View style={[styles.sectionTitleWrap, isRTL && styles.sectionTitleWrapRtl]}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionTitle, { textAlign, writingDirection: titleDirection }]}>
          {title}
        </Text>
      </View>
      {action && onAction ? (
        <AnimatedPressable
          onPress={onAction}
          haptic="selection"
          scaleTo={0.94}
          style={[styles.sectionActionPill, isRTL && styles.sectionActionPillRtl]}
        >
          <Text style={styles.sectionAction}>{action}</Text>
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={13}
            color={colors.primary}
          />
        </AnimatedPressable>
      ) : action ? (
        <Text style={[styles.sectionMutedAction, { textAlign }]} numberOfLines={1}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const RestaurantPreviewCard = memo(function RestaurantPreviewCard({
  restaurant,
  width,
  isFavorited,
  onToggleFavorite,
  highlightTag,
  isNew = false,
}: {
  restaurant: Restaurant;
  width: number;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  /** Optional badge like "Most ordered today" shown over the cover. */
  highlightTag?: string;
  isNew?: boolean;
}) {
  const { t } = useHomeT();
  const { isRTL, language } = useLanguageStore();
  const isArabic = language === "ar";
  const textAlign = isRTL ? "right" : "left";
  const meta = getCategoryMeta(restaurant.cuisineType);
  const handlePress = () => router.push(`/restaurants/${restaurant.id}` as never);

  const cuisineLabel = restaurant.cuisineType
    ? getCategoryLabel(restaurant.cuisineType, isArabic)
    : formatCuisineType(restaurant.cuisineType);

  return (
    <AnimatedPressable
      onPress={handlePress}
      haptic="impact"
      scaleTo={0.97}
      style={[styles.rCard, { width }]}
    >
      <View style={styles.rCoverWrap}>
        <Image
          source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
          placeholder={IMAGE_BLURHASH}
          contentFit="cover"
          transition={240}
          style={styles.rCover}
        />
        <LinearGradient
          colors={["rgba(15,15,15,0)", "rgba(15,15,15,0.06)", "rgba(15,15,15,0.45)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.rTopRow, isRTL && styles.rRowRtl]}>
          <View style={[styles.rBadgeStack, isRTL && styles.rBadgeStackRtl]}>
            <View style={[styles.rBadgeRow, isRTL && styles.rRowRtl]}>
              <View
                style={[
                  styles.rStatusBadge,
                  restaurant.isOpen ? styles.openBadge : styles.closedBadge,
                ]}
              >
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>
                  {restaurant.isOpen ? t("restaurant.open") : t("restaurant.closed")}
                </Text>
              </View>
              {isNew ? (
                <View style={styles.rNewBadge}>
                  <Ionicons name="sparkles" size={10} color="#fff" />
                  <Text style={styles.rNewBadgeText}>{t("tags.new")}</Text>
                </View>
              ) : null}
            </View>
            {highlightTag ? (
              <View style={[styles.rHighlightTag, isRTL && styles.rRowRtl]}>
                <Ionicons name="flame" size={11} color="#fff" />
                <Text style={styles.rHighlightTagText} numberOfLines={1}>
                  {highlightTag}
                </Text>
              </View>
            ) : null}
          </View>

          <AnimatedPressable
            onPress={(e) => {
              (e as any).stopPropagation?.();
              onToggleFavorite();
            }}
            haptic="selection"
            scaleTo={0.82}
            style={[styles.rHeart, isFavorited && styles.rHeartActive]}
          >
            <Ionicons
              name={isFavorited ? "heart" : "heart-outline"}
              size={17}
              color={isFavorited ? colors.primary : "#fff"}
            />
          </AnimatedPressable>
        </View>

        <View style={[styles.rCuisineChip, isRTL && styles.rCuisineChipRtl]}>
          <Text style={styles.rCuisineEmoji}>{meta.emoji}</Text>
          <Text style={styles.rCuisineText} numberOfLines={1}>
            {cuisineLabel}
          </Text>
        </View>

        <View style={[styles.rLogoWrap, isRTL && styles.rLogoWrapRtl]}>
          <Image
            source={imageSource(restaurant.logoUrl, restaurant.cuisineType)}
            placeholder={IMAGE_BLURHASH}
            contentFit="cover"
            transition={180}
            style={styles.rLogo}
          />
        </View>
      </View>

      <View style={styles.rBody}>
        <View
          style={[
            styles.rNameRow,
            isRTL ? { paddingRight: 0, paddingLeft: 44, flexDirection: "row-reverse" } : null,
          ]}
        >
          <Text style={[styles.rName, { textAlign }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color="#D68A00" />
            <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={[styles.rFooter, isRTL && styles.rRowRtl]}>
          {restaurant.minOrderAmount > 0 ? (
            <View style={[styles.rMetaItem, isRTL && styles.rRowRtl]}>
              <Ionicons name="bag-handle-outline" size={14} color={colors.primary} />
              <Text style={styles.rMetaText} numberOfLines={1}>
                {t("restaurant.minOrderAmount", {
                  amount: restaurant.minOrderAmount.toFixed(0),
                  currency: t("price.currency"),
                })}
              </Text>
            </View>
          ) : null}

          {restaurant.minOrderAmount > 0 && restaurant.city ? (
            <View style={styles.rMetaDivider} />
          ) : null}

          {restaurant.city ? (
            <View style={[styles.rMetaItem, isRTL && styles.rRowRtl]}>
              <Ionicons name="location-outline" size={14} color={colors.outline} />
              <Text style={[styles.rMetaText, styles.rCityText]} numberOfLines={1}>
                {restaurant.city}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
});

const MealPreviewCard = memo(function MealPreviewCard({
  meal,
  restaurantName,
  width,
  onPress,
}: {
  meal: Meal;
  restaurantName?: string;
  width: number;
  onPress: (meal: Meal) => void;
}) {
  const { t } = useHomeT();
  const { isRTL } = useLanguageStore();
  const textAlign = isRTL ? "right" : "left";
  const currency = t("price.currency");
  const hasDiscount =
    typeof meal.discountPrice === "number" &&
    typeof meal.basePrice === "number" &&
    meal.discountPrice < meal.basePrice;

  return (
    <AnimatedPressable
      onPress={() => onPress(meal)}
      disabled={!meal.isAvailable}
      disabledStyle={styles.disabledCard}
      haptic="impact"
      scaleTo={0.96}
      style={[styles.mealPreviewCard, { width }]}
    >
      <View style={styles.mealImageWrap}>
        <Image
          source={getMealImageSource(meal.imageUrl, meal.tags)}
          placeholder={IMAGE_BLURHASH}
          contentFit="cover"
          transition={220}
          style={styles.mealPreviewImage}
        />
        {meal.isFeatured ? (
          <View style={[styles.mealBadge, isRTL && styles.mealBadgeRtl]}>
            <Ionicons name="flame" size={11} color={colors.onPrimary} />
            <Text style={styles.mealBadgeText}>{t("meal.popular")}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.mealPreviewBody}>
        <Text style={[styles.mealPreviewName, { textAlign }]} numberOfLines={1}>
          {meal.name}
        </Text>

        {restaurantName ? (
          <View style={[styles.mealStoreRow, isRTL && styles.mealStoreRowRtl]}>
            <Ionicons name="storefront-outline" size={11} color={colors.outline} />
            <Text style={[styles.mealStoreText, { textAlign }]} numberOfLines={1}>
              {restaurantName}
            </Text>
          </View>
        ) : null}

        <View style={[styles.mealPreviewFooter, isRTL && styles.mealPreviewFooterRtl]}>
          <View style={[styles.mealPriceWrap, isRTL && styles.mealStoreRowRtl]}>
            <Text style={[styles.mealPreviewPrice, { textAlign }]}>
              {formatPrice(hasDiscount ? (meal.discountPrice as number) : meal.price, currency)}
            </Text>
            {hasDiscount ? (
              <Text style={styles.mealOldPrice}>
                {formatPrice(meal.basePrice as number, currency)}
              </Text>
            ) : null}
          </View>
          <View style={styles.addBubble}>
            <Ionicons name="add" size={16} color={colors.onPrimary} />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
});

function RailSkeleton({
  count = 3,
  width = 144,
  height = 168,
}: {
  count?: number;
  width?: number;
  height?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.skeletonCard, { width, height }]} />
      ))}
    </ScrollView>
  );
}

function EmptySection({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { isRTL } = useLanguageStore();
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={[styles.emptySection, isRTL && styles.emptySectionRtl]}>
      <View style={styles.emptyIcon}>
        <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.emptyTextWrap}>
        <Text style={[styles.emptyText, { textAlign }]}>{text}</Text>
        {actionLabel && onAction ? (
          <AnimatedPressable onPress={onAction} haptic="selection" scaleTo={0.94}>
            <Text style={[styles.emptyAction, { textAlign }]}>{actionLabel}</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

// Compact header that fades/slides in once the hero has scrolled away — keeps
// the greeting + cart reachable without the big hero taking up the viewport.
function StickyHeader({
  scrollY,
  firstName,
}: {
  scrollY: SharedValue<number>;
  firstName: string;
}) {
  const { t } = useHomeT();
  const isRTL = useLanguageStore((s) => s.isRTL);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 180], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [120, 180], [-12, 0], Extrapolation.CLAMP) },
    ],
    pointerEvents: scrollY.value > 150 ? ("auto" as const) : ("none" as const),
  }));

  return (
    <Animated.View style={[styles.stickyHeader, animatedStyle]} pointerEvents="box-none">
      <SafeAreaView edges={["top"]} style={[styles.stickyInner, isRTL && styles.rowReverse]}>
        <Ionicons name="restaurant" size={18} color={colors.primary} />
        <Text
          style={[styles.stickyAddressText, { writingDirection: isRTL ? "rtl" : "ltr" }]}
          numberOfLines={1}
        >
          {t(`greeting.${getGreetingKey()}`)}, {firstName}
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
}

// Generic horizontal rail wrapper — keeps every section's scroll feel identical.
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

function HomeScreen() {
  const { t } = useHomeT();
  const { language } = useLanguageStore();
  const isRTL = useLanguageStore((s) => s.isRTL);
  const { width } = useWindowDimensions();
  const { data: profile } = useGetProfile();
  const feed = useRestaurantHomeFeed();
  const addItem = useCartStore((state) => state.addItem);
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  const [search, setSearch] = useState("");

  const { data: favoriteRestaurants = [] } = useFavoriteRestaurants();
  const { isFavorite } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();

  // Sticky-header collapse driver.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Derived rails (Trending / Top Rated / New / Suggested) from already-loaded data.
  const sections = useHomeSections(feed.restaurants, favoriteRestaurants);

  const firstName = profile?.firstName?.trim() || t("user.guest");
  const mealCardWidth = Math.min(width * 0.42, 172);
  const topRatedCardWidth = Math.min(width * 0.44, 190);
  // Restaurants rail: a roomy card with the next one peeking, so users learn
  // the rail scrolls. Capped so it never gets oversized on tablets.
  const restaurantCardWidth = Math.min(width * 0.74, 300);
  const normalizedSearch = search.trim().toLowerCase();
  // When the user is searching, collapse the marketing rails and show only
  // matched restaurants + meals — keeps results focused (original UX intent).
  const isSearching = normalizedSearch.length > 0;

  const restaurantPreview = useMemo(
    () =>
      feed.filteredRestaurants
        .filter((restaurant) => {
          if (!normalizedSearch) return true;
          return (
            restaurant.name.toLowerCase().includes(normalizedSearch) ||
            restaurant.cuisineType.toLowerCase().includes(normalizedSearch)
          );
        })
        .slice(0, 10),
    [feed.filteredRestaurants, normalizedSearch],
  );

  const popularMeals = useMemo(
    () =>
      feed.popularMeals
        .filter(({ meal }) => {
          if (!normalizedSearch) return true;
          return (
            meal.name.toLowerCase().includes(normalizedSearch) ||
            (meal.description ?? "").toLowerCase().includes(normalizedSearch)
          );
        })
        .slice(0, 8),
    [feed.popularMeals, normalizedSearch],
  );

  const handleCategoryPress = useCallback(
    (cuisineType: string | null) => {
      // Tapping the already-active category clears it back to "All".
      feed.setSelectedCuisineType(
        cuisineType !== null && cuisineType === feed.selectedCuisineType ? null : cuisineType,
      );
    },
    [feed],
  );

  const isArabic = language === "ar";
  const activeCategoryLabel = feed.selectedCuisineType
    ? getCategoryLabel(feed.selectedCuisineType, isArabic)
    : null;

  const handleConfirmMeal = useCallback(
    (result: MealSelectionResult) => {
      addItem(result);
      setActiveMeal(null);
    },
    [addItem],
  );

  const openRestaurant = useCallback(
    (id: string) => router.push(`/restaurants/${id}` as never),
    [],
  );

  return (
    <SafeAreaView key={language} style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Compact header fades in once the hero scrolls away */}
      <StickyHeader scrollY={scrollY} firstName={firstName} />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefreshing}
            onRefresh={feed.refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Hero + Search */}
        <FadeInView>
          <HomeHero
            firstName={firstName}
            search={search}
            onSearchChange={setSearch}
          />
        </FadeInView>

        {/* Explore Cuisines 🌍 (primary cuisine picker + filter) */}
        {!isSearching ? (
          <FadeInView delay={120}>
            <SectionHeader title={t("sections.exploreCuisines")} />
            {feed.isCategoriesLoading ? (
              <Rail>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.cuisineSkeleton} />
                ))}
              </Rail>
            ) : (
              <Rail>
                {/* "All" reset tile — clears the active cuisine filter. */}
                <CuisineChip
                  label={t("category.all")}
                  variant="all"
                  isRTL={isRTL}
                  selected={feed.selectedCuisineType === null}
                  onPress={() => feed.setSelectedCuisineType(null)}
                />
                {feed.categories
                  .filter((c) => c.cuisineType)
                  .map((category) => (
                    <CuisineChip
                      key={category.id ?? category.cuisineType}
                      label={
                        category.name?.trim() ||
                        getCategoryLabel(category.cuisineType as string, isArabic)
                      }
                      cuisineType={category.cuisineType as string}
                      imageUri={category.iconUrl}
                      isRTL={isRTL}
                      selected={category.cuisineType === feed.selectedCuisineType}
                      onPress={() => handleCategoryPress(category.cuisineType)}
                    />
                  ))}
              </Rail>
            )}
          </FadeInView>
        ) : null}

        {/* 5 — Trending 🔥 (search results / category-filtered list / trending) */}
        <FadeInView delay={180}>
          <SectionHeader
            title={
              isSearching
                ? t("sections.restaurants")
                : activeCategoryLabel
                  ? `${t("sections.restaurants")} · ${activeCategoryLabel}`
                  : t("sections.trending")
            }
            action={t("actions.seeAll")}
            onAction={() => router.push("/restaurants" as never)}
          />
          {feed.isRestaurantsLoading && !restaurantPreview.length ? (
            <Rail>
              {Array.from({ length: 3 }).map((_, index) => (
                <View key={index} style={[styles.rCardSkeleton, { width: restaurantCardWidth }]} />
              ))}
            </Rail>
          ) : (isSearching || activeCategoryLabel ? restaurantPreview : sections.trending).length ? (
            <Rail>
              {(isSearching || activeCategoryLabel ? restaurantPreview : sections.trending).map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={200 + index * 55}>
                  <RestaurantPreviewCard
                    restaurant={restaurant}
                    width={restaurantCardWidth}
                    isFavorited={isFavorite(restaurant.id)}
                    onToggleFavorite={() => toggleFavorite(restaurant)}
                    highlightTag={!isSearching && !activeCategoryLabel && index === 0 ? t("tags.mostOrdered") : undefined}
                    isNew={isNewRestaurant(restaurant.id)}
                  />
                </FadeInView>
              ))}
            </Rail>
          ) : activeCategoryLabel ? (
            <EmptySection
              text={t("empty.restaurantsInCategory")}
              actionLabel={t("category.showAll")}
              onAction={() => feed.setSelectedCuisineType(null)}
            />
          ) : (
            <EmptySection text={t("empty.restaurantsInCategory")} />
          )}
        </FadeInView>

        {/* 6 — Popular Meals */}
        <FadeInView delay={230}>
          <SectionHeader
            title={
              activeCategoryLabel
                ? `${t("sections.popularMeals")} · ${activeCategoryLabel}`
                : t("sections.popularMeals")
            }
          />
          {feed.isMealsLoading && !popularMeals.length ? (
            <RailSkeleton count={3} width={mealCardWidth} height={234} />
          ) : popularMeals.length ? (
            <Rail>
              {popularMeals.map(({ meal, restaurant }, index) => (
                <FadeInView key={`${restaurant.id}:${meal.id}`} delay={250 + index * 45}>
                  <MealPreviewCard
                    meal={meal}
                    restaurantName={restaurant.name}
                    width={mealCardWidth}
                    onPress={setActiveMeal}
                  />
                </FadeInView>
              ))}
            </Rail>
          ) : (
            <EmptySection text={t("empty.mealsForRestaurant")} />
          )}
        </FadeInView>

        {/* Promo banners — placed mid-feed so it breaks up the rails nicely */}
        {!isSearching ? (
          <FadeInView delay={250} style={styles.sectionGap}>
            <PromoCarousel onPressBanner={() => router.push("/restaurants" as never)} />
          </FadeInView>
        ) : null}

        {/* Top Rated ⭐ */}
        {!isSearching && !activeCategoryLabel && sections.topRated.length > 0 ? (
          <FadeInView delay={270}>
            <SectionHeader
              title={t("sections.topRated")}
              action={t("actions.seeAll")}
              onAction={() => router.push("/restaurants" as never)}
            />
            <Rail>
              {sections.topRated.map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={290 + index * 45}>
                  <TopRatedCard
                    restaurant={restaurant}
                    width={topRatedCardWidth}
                    isRTL={isRTL}
                    onPress={() => openRestaurant(restaurant.id)}
                  />
                </FadeInView>
              ))}
            </Rail>
          </FadeInView>
        ) : null}

        {/* New on App ✨ */}
        {!isSearching && !activeCategoryLabel && sections.newOnApp.length > 0 ? (
          <FadeInView delay={330}>
            <SectionHeader title={t("sections.newOnApp")} />
            <Rail>
              {sections.newOnApp.map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={350 + index * 45}>
                  <RestaurantPreviewCard
                    restaurant={restaurant}
                    width={restaurantCardWidth}
                    isFavorited={isFavorite(restaurant.id)}
                    onToggleFavorite={() => toggleFavorite(restaurant)}
                    isNew
                  />
                </FadeInView>
              ))}
            </Rail>
          </FadeInView>
        ) : null}

        {/* 10 — Suggested For You 🤖 */}
        {!isSearching && !activeCategoryLabel && sections.suggested.length > 0 ? (
          <FadeInView delay={360}>
            <SectionHeader title={t("sections.suggested")} />
            <Rail>
              {sections.suggested.map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={380 + index * 45}>
                  <RestaurantPreviewCard
                    restaurant={restaurant}
                    width={restaurantCardWidth}
                    isFavorited={isFavorite(restaurant.id)}
                    onToggleFavorite={() => toggleFavorite(restaurant)}
                  />
                </FadeInView>
              ))}
            </Rail>
          </FadeInView>
        ) : null}
      </Animated.ScrollView>

      <FloatingTabBar />

      <MealOptionsModal
        visible={!!activeMeal}
        meal={activeMeal}
        onClose={() => setActiveMeal(null)}
        onConfirm={handleConfirmMeal}
        currency={t("price.currency")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    paddingBottom: screen.bottomTabSpace + 18,
  },
  rowReverse: { flexDirection: "row-reverse" },
  sectionGap: { marginBottom: 24 },

  // Sticky header
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: colors.softSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    ...shadows.soft,
  },
  stickyInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: screen.horizontal,
    paddingBottom: 10,
  },
  stickyAddressText: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
    flex: 1,
  },
  // New badge + highlight tag on restaurant cards.
  // Column so badges stack at the top-left (status/new on top, the "most
  // ordered" ribbon below) — never overlapping the bottom cuisine chip.
  rBadgeStack: { alignItems: "flex-start", gap: 6 },
  rBadgeStackRtl: { alignItems: "flex-end" },
  rBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rNewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  rNewBadgeText: {
    fontFamily: typography.bodyBold,
    color: "#fff",
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  rHighlightTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    ...shadows.primary,
  },
  rHighlightTagText: {
    fontFamily: typography.bodyBold,
    color: "#fff",
    fontSize: 10.5,
  },

  heroCard: {
    marginHorizontal: screen.horizontal,
    marginTop: 8,
    marginBottom: 24,
    minHeight: 286,
    borderRadius: 30,
    backgroundColor: colors.primary,
    overflow: "hidden",
    padding: 18,
    ...shadows.primary,
  },
  heroShapeLarge: {
    position: "absolute",
    width: 172,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.13)",
    top: 22,
    right: -44,
    transform: [{ rotate: "-22deg" }],
  },
  heroShapeSmall: {
    position: "absolute",
    width: 118,
    height: 62,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    bottom: 62,
    left: -34,
    transform: [{ rotate: "18deg" }],
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  heroTopRowRtl: {
    flexDirection: "row-reverse",
  },
  heroGreeting: {
    fontFamily: typography.bodyMedium,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
  },
  heroName: {
    marginTop: 2,
    fontFamily: typography.headlineSemi,
    color: colors.onPrimary,
    fontSize: 19,
    lineHeight: 25,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.17)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMainRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroMainRowRtl: {
    flexDirection: "row-reverse",
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroTitle: {
    fontFamily: typography.headline,
    color: colors.onPrimary,
    fontSize: 27,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontFamily: typography.bodyMedium,
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    lineHeight: 19,
  },
  heroVisualWrap: {
    width: 106,
    height: 106,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroVisualGlow: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    transform: [{ rotate: "12deg" }],
  },
  heroVisualImage: {
    width: 82,
    height: 82,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.28)",
  },
  heroVisualBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 33,
    height: 33,
    borderRadius: 16.5,
    backgroundColor: colors.onPrimary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  heroSearch: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.17)",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  heroSearchRtl: {
    flexDirection: "row-reverse",
  },
  heroSearchInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
    fontFamily: typography.bodyMedium,
    color: colors.onPrimary,
    fontSize: 14,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 13,
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderRtl: {
    flexDirection: "row-reverse",
  },
  sectionTitleWrap: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  sectionTitleWrapRtl: {
    flexDirection: "row-reverse",
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: typography.headline,
    color: colors.onSurface,
    fontSize: 18,
  },
  sectionActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.faintPrimary,
  },
  sectionActionPillRtl: {
    flexDirection: "row-reverse",
    paddingLeft: 8,
    paddingRight: 12,
  },
  sectionAction: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 12,
  },
  sectionMutedAction: {
    flexShrink: 1,
    maxWidth: 150,
    textAlign: "right",
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  rail: {
    paddingHorizontal: screen.horizontal,
    gap: 14,
    paddingBottom: 26,
  },
  cuisineSkeleton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHighest,
  },
  rCard: {
    borderRadius: radii.xxl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.card,
  },
  rCoverWrap: {
    height: 148,
    backgroundColor: colors.surfaceContainer,
    position: "relative",
  },
  rCover: {
    width: "100%",
    height: "100%",
  },
  rRowRtl: {
    flexDirection: "row-reverse",
  },
  rTopRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  openBadge: {
    backgroundColor: "rgba(22,163,74,0.94)",
  },
  closedBadge: {
    backgroundColor: "rgba(60,60,60,0.92)",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.onPrimary,
  },
  statusBadgeText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 10,
  },
  rHeart: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(20,20,20,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  rHeartActive: {
    backgroundColor: colors.card,
    borderColor: "rgba(245,89,5,0.2)",
    ...shadows.primary,
  },
  rCuisineChip: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    maxWidth: "70%",
  },
  rCuisineChipRtl: {
    left: undefined,
    right: 12,
    flexDirection: "row-reverse",
  },
  rCuisineEmoji: {
    fontSize: 13,
  },
  rCuisineText: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 11,
  },
  rLogoWrap: {
    position: "absolute",
    bottom: -22,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 3,
    ...shadows.soft,
  },
  rLogoWrapRtl: {
    right: undefined,
    left: 16,
  },
  rLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 13,
  },
  rBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
  },
  rNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingRight: 44,
  },
  rName: {
    flex: 1,
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 16,
    lineHeight: 22,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "#FFF3D8",
  },
  ratingText: {
    fontFamily: typography.bodyBold,
    color: "#8A5A00",
    fontSize: 11,
  },
  rFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  rMetaText: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 12,
  },
  rCityText: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
  },
  rMetaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.surfaceContainerHighest,
  },
  rCardSkeleton: {
    height: 240,
    borderRadius: radii.xxl,
    backgroundColor: colors.surfaceContainerHighest,
  },
  mealPreviewCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.soft,
  },
  disabledCard: {
    opacity: 0.55,
  },
  mealImageWrap: {
    width: "100%",
    height: 124,
    backgroundColor: colors.surfaceContainer,
    position: "relative",
  },
  mealPreviewImage: {
    width: "100%",
    height: "100%",
  },
  mealBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  mealBadgeRtl: {
    left: undefined,
    right: 8,
    flexDirection: "row-reverse",
  },
  mealBadgeText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 9,
  },
  mealPreviewBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  mealPreviewName: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 19,
  },
  mealStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealStoreRowRtl: {
    flexDirection: "row-reverse",
  },
  mealStoreText: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
  },
  mealPreviewFooter: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  mealPreviewFooterRtl: {
    flexDirection: "row-reverse",
  },
  mealPriceWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealPreviewPrice: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 14,
  },
  mealOldPrice: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  addBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  skeletonCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerHighest,
  },
  emptySection: {
    marginHorizontal: screen.horizontal,
    marginBottom: 24,
    padding: 14,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadows.soft,
  },
  emptySectionRtl: {
    flexDirection: "row-reverse",
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextWrap: {
    flex: 1,
    gap: 6,
  },
  emptyText: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  emptyAction: {
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 12,
  },
});

export default function Home() {
  return (
    <ProtectedRoute redirectTo="/auth/login" requireAuth>
      <HomeScreen />
    </ProtectedRoute>
  );
}
