import React, { useCallback, useMemo, useState } from "react";
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
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import { useHomeT } from "@/hooks/useAppTranslation";
import { useGetProfile } from "@/modules/Profile/hooks/useGetProfile";
import {
  HomeCategory,
  useRestaurantHomeFeed,
} from "@/modules/Restaurants/hooks/useRestaurantHomeFeed";
import { useFavoriteRestaurants } from "@/modules/Restaurants/hooks/useFavoriteRestaurants";
import { useToggleFavorite } from "@/modules/Restaurants/hooks/useToggleFavorite";
import { useFavorites } from "@/modules/Restaurants/hooks/useFavorites";
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
  ALL_CATEGORY_META,
  getCategoryLabel,
  getCategoryMeta,
} from "@/modules/Restaurants/utils/categoryMeta";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { getCartQuantity, useCartStore } from "@/store/useCartStore";
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
  cartCount,
  search,
  onSearchChange,
}: {
  firstName: string;
  cartCount: number;
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

          <AnimatedPressable
            onPress={() => router.navigate("/cart" as never)}
            style={styles.heroIconButton}
            accessibilityLabel={t("accessibility.cart")}
          >
            <Ionicons name="bag-handle-outline" size={18} color={colors.onPrimary} />
            {cartCount > 0 ? (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
              </View>
            ) : null}
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

function CategoryChip({
  category,
  selected,
  onPress,
}: {
  category: HomeCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useHomeT();
  const { isRTL, language } = useLanguageStore();
  const isArabic = language === "ar";

  const isAll = category.cuisineType === null;
  const meta = isAll ? ALL_CATEGORY_META : getCategoryMeta(category.cuisineType);
  // Prefer the catalogue name; fall back to the localized cuisine label.
  const label = isAll
    ? t("category.all")
    : category.name?.trim() || getCategoryLabel(category.cuisineType, isArabic);
  const hasIcon = !isAll && !!category.iconUrl;

  // Selected pill lifts gently on a spring.
  const progress = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 220 });
  }, [selected, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * 2 }],
  }));

  const labelColor = selected ? colors.onPrimary : colors.onSurface;
  const countActiveColor = selected ? "rgba(255,255,255,0.22)" : colors.faintPrimary;
  const countTextColor = selected ? colors.onPrimary : colors.primary;

  const Inner = (
    <>
      {/* Leading icon disc — image, emoji, or a glyph for "All". */}
      <View
        style={[
          styles.catDisc,
          selected && styles.catDiscSelected,
          { backgroundColor: selected ? "rgba(255,255,255,0.2)" : `${meta.gradient[1]}1A` },
        ]}
      >
        {hasIcon ? (
          <Image
            source={{ uri: category.iconUrl as string }}
            contentFit="cover"
            transition={180}
            style={styles.catDiscIcon}
          />
        ) : isAll ? (
          <Ionicons
            name="sparkles"
            size={15}
            color={selected ? colors.onPrimary : meta.gradient[1]}
          />
        ) : (
          <Text style={styles.catDiscEmoji}>{meta.emoji}</Text>
        )}
      </View>

      <Text style={[styles.catLabel, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>

      {category.count > 0 ? (
        <View style={[styles.catCount, { backgroundColor: countActiveColor }]}>
          <Text style={[styles.catCountText, { color: countTextColor }]}>
            {category.count > 99 ? "99+" : category.count}
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="impact"
      scaleTo={0.95}
      style={styles.catPressable}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Animated.View style={pillStyle}>
        {selected ? (
          <LinearGradient
            colors={meta.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.catPill, styles.catPillSelected, isRTL && styles.catPillRtl]}
          >
            {Inner}
          </LinearGradient>
        ) : (
          <View style={[styles.catPill, styles.catPillIdle, isRTL && styles.catPillRtl]}>
            {Inner}
          </View>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

function RestaurantPreviewCard({
  restaurant,
  width,
  isFavorited,
  onToggleFavorite,
}: {
  restaurant: Restaurant;
  width: number;
  isFavorited: boolean;
  onToggleFavorite: () => void;
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
          <View style={[styles.rMetaItem, isRTL && styles.rRowRtl]}>
            <Ionicons name="bag-handle-outline" size={14} color={colors.primary} />
            <Text style={styles.rMetaText} numberOfLines={1}>
              {t("restaurant.minOrderAmount", {
                amount: restaurant.minOrderAmount.toFixed(0),
                currency: t("price.currency"),
              })}
            </Text>
          </View>

          {restaurant.city ? (
            <>
              <View style={styles.rMetaDivider} />
              <View style={[styles.rMetaItem, isRTL && styles.rRowRtl]}>
                <Ionicons name="location-outline" size={14} color={colors.outline} />
                <Text style={[styles.rMetaText, styles.rCityText]} numberOfLines={1}>
                  {restaurant.city}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

function MealPreviewCard({
  meal,
  width,
  onPress,
}: {
  meal: Meal;
  width: number;
  onPress: (meal: Meal) => void;
}) {
  const { t } = useHomeT();
  const { isRTL } = useLanguageStore();
  const textAlign = isRTL ? "right" : "left";
  const currency = t("price.currency");

  return (
    <AnimatedPressable
      onPress={() => onPress(meal)}
      disabled={!meal.isAvailable}
      disabledStyle={styles.disabledCard}
      haptic="impact"
      style={[styles.mealPreviewCard, { width }]}
    >
      <Image
        source={getMealImageSource(meal.imageUrl, meal.tags)}
        placeholder={IMAGE_BLURHASH}
        contentFit="cover"
        transition={220}
        style={styles.mealPreviewImage}
      />
      <View style={styles.mealPreviewBody}>
        <Text style={[styles.mealPreviewName, { textAlign }]} numberOfLines={2}>
          {meal.name}
        </Text>
        <View style={[styles.mealPreviewFooter, isRTL && styles.mealPreviewFooterRtl]}>
          <Text style={[styles.mealPreviewPrice, { textAlign }]}>
            {formatPrice(meal.price, currency)}
          </Text>
          <View style={styles.addBubble}>
            <Ionicons name="add" size={16} color={colors.onPrimary} />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function FavoriteCard({
  restaurant,
  isFavorited,
  onToggle,
  onPress,
  isRTL,
}: {
  restaurant: Restaurant;
  isFavorited: boolean;
  onToggle: () => void;
  onPress: () => void;
  isRTL: boolean;
}) {
  return (
    <AnimatedPressable onPress={onPress} haptic="impact" style={styles.favCard}>
      <View style={styles.favImageWrap}>
        <Image
          source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
          placeholder={IMAGE_BLURHASH}
          contentFit="cover"
          transition={200}
          style={styles.favImage}
        />
        <View style={[styles.favStatus, restaurant.isOpen ? styles.openBadge : styles.closedBadge]}>
          <View style={styles.statusDot} />
        </View>
        <AnimatedPressable
          onPress={(e) => { (e as any).stopPropagation?.(); onToggle(); }}
          haptic="selection"
          scaleTo={0.84}
          style={styles.favHeart}
        >
          <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={14} color={isFavorited ? "#F55905" : "#fff"} />
        </AnimatedPressable>
      </View>
      <View style={styles.favBody}>
        <Text style={[styles.favName, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={11} color="#D68A00" />
          <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function RailSkeleton({ count = 3, width = 144, height = 168 }: { count?: number; width?: number; height?: number }) {
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

function HomeScreen() {
  const { t } = useHomeT();
  const { language } = useLanguageStore();
  const isRTL = useLanguageStore((s) => s.isRTL);
  const { width } = useWindowDimensions();
  const { data: profile } = useGetProfile();
  const feed = useRestaurantHomeFeed();
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  const [search, setSearch] = useState("");

  const { data: favoriteRestaurants = [] } = useFavoriteRestaurants();
  const { isFavorite } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const cartCount = getCartQuantity(cartItems);
  const firstName = profile?.firstName?.trim() || t("user.guest");
  const mealCardWidth = Math.min(width * 0.42, 172);
  // Restaurants rail: a roomy card with the next one peeking, so users learn
  // the rail scrolls. Capped so it never gets oversized on tablets.
  const restaurantCardWidth = Math.min(width * 0.74, 300);
  const normalizedSearch = search.trim().toLowerCase();

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
      feed.meals
        .filter((meal) => {
          if (!normalizedSearch) return true;
          return (
            meal.name.toLowerCase().includes(normalizedSearch) ||
            (meal.description ?? "").toLowerCase().includes(normalizedSearch)
          );
        })
        .slice(0, 5),
    [feed.meals, normalizedSearch],
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

  return (
    <SafeAreaView key={language} style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <ScrollView
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
        <FadeInView>
          <HomeHero
            firstName={firstName}
            cartCount={cartCount}
            search={search}
            onSearchChange={setSearch}
          />
        </FadeInView>

        {favoriteRestaurants.length > 0 ? (
          <FadeInView delay={80}>
            <SectionHeader
              title={t("sections.saved")}
              action={t("actions.seeAll")}
              onAction={() => router.push("/restaurants" as never)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              decelerationRate="fast"
            >
              {favoriteRestaurants.map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={110 + index * 50}>
                  <FavoriteCard
                    restaurant={restaurant}
                    isFavorited={isFavorite(restaurant.id)}
                    onToggle={() =>
                      toggleFavorite({ restaurantId: restaurant.id, isFavorite: isFavorite(restaurant.id) })
                    }
                    onPress={() =>
                      router.push({ pathname: "/restaurants/[id]", params: { id: restaurant.id } } as never)
                    }
                    isRTL={isRTL}
                  />
                </FadeInView>
              ))}
            </ScrollView>
          </FadeInView>
        ) : null}

        <FadeInView delay={130}>
          <SectionHeader title={t("sections.categories")} />
          {feed.isCategoriesLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRail}
            >
              {[96, 124, 108, 132, 100, 120].map((w, index) => (
                <View key={index} style={[styles.catPillSkeleton, { width: w }]} />
              ))}
            </ScrollView>
          ) : feed.categories.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRail}
            >
              {feed.categories.map((category, index) => (
                <FadeInView key={category.id ?? "all"} delay={170 + index * 40}>
                  <CategoryChip
                    category={category}
                    selected={category.cuisineType === feed.selectedCuisineType}
                    onPress={() => handleCategoryPress(category.cuisineType)}
                  />
                </FadeInView>
              ))}
            </ScrollView>
          ) : (
            <EmptySection text={t("empty.noCategories")} />
          )}
        </FadeInView>

        <FadeInView delay={230}>
          <SectionHeader
            title={
              activeCategoryLabel
                ? `${t("sections.restaurants")} · ${activeCategoryLabel}`
                : t("sections.restaurants")
            }
            action={t("actions.seeAll")}
            onAction={() => router.push("/restaurants" as never)}
          />
          {feed.isRestaurantsLoading && !restaurantPreview.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <View key={index} style={[styles.rCardSkeleton, { width: restaurantCardWidth }]} />
              ))}
            </ScrollView>
          ) : restaurantPreview.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              decelerationRate="fast"
            >
              {restaurantPreview.map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={260 + index * 60}>
                  <RestaurantPreviewCard
                    restaurant={restaurant}
                    width={restaurantCardWidth}
                    isFavorited={isFavorite(restaurant.id)}
                    onToggleFavorite={() =>
                      toggleFavorite({
                        restaurantId: restaurant.id,
                        isFavorite: isFavorite(restaurant.id),
                      })
                    }
                  />
                </FadeInView>
              ))}
            </ScrollView>
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

        <FadeInView delay={320}>
          <SectionHeader
            title={t("sections.popularMeals")}
            action={feed.selectedRestaurant?.name}
          />
          {feed.isMealsLoading && !popularMeals.length ? (
            <RailSkeleton count={3} width={mealCardWidth} height={214} />
          ) : popularMeals.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              decelerationRate="fast"
            >
              {popularMeals.map((meal, index) => (
                <FadeInView key={meal.id} delay={350 + index * 50}>
                  <MealPreviewCard meal={meal} width={mealCardWidth} onPress={setActiveMeal} />
                </FadeInView>
              ))}
            </ScrollView>
          ) : (
            <EmptySection text={t("empty.mealsForRestaurant")} />
          )}
        </FadeInView>
      </ScrollView>

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
  heroBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 15,
    height: 15,
    borderRadius: radii.pill,
    backgroundColor: colors.onPrimary,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontFamily: typography.bodyBold,
    fontSize: 8,
    color: colors.primary,
    lineHeight: 9,
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
  categoryRail: {
    paddingHorizontal: screen.horizontal,
    gap: 10,
    paddingTop: 2,
    paddingBottom: 24,
  },
  catPressable: {
    borderRadius: radii.pill,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingLeft: 7,
    paddingRight: 14,
    borderRadius: radii.pill,
  },
  catPillRtl: {
    flexDirection: "row-reverse",
    paddingLeft: 14,
    paddingRight: 7,
  },
  catPillIdle: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "#ECECEC",
    ...shadows.soft,
  },
  catPillSelected: {
    ...shadows.primary,
  },
  catDisc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  catDiscSelected: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  catDiscIcon: {
    width: "100%",
    height: "100%",
  },
  catDiscEmoji: {
    fontSize: 17,
    lineHeight: 21,
  },
  catLabel: {
    fontFamily: typography.headlineSemi,
    fontSize: 13.5,
  },
  catCount: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  catCountText: {
    fontFamily: typography.bodyBold,
    fontSize: 10,
    lineHeight: 13,
  },
  catPillSkeleton: {
    width: 104,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
  rail: {
    paddingHorizontal: screen.horizontal,
    gap: 14,
    paddingBottom: 26,
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
  mealPreviewImage: {
    width: "100%",
    height: 124,
    backgroundColor: colors.surfaceContainer,
  },
  mealPreviewBody: {
    padding: 12,
    gap: 10,
  },
  mealPreviewName: {
    minHeight: 39,
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 19,
  },
  mealPreviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  mealPreviewFooterRtl: {
    flexDirection: "row-reverse",
  },
  mealPreviewPrice: {
    flex: 1,
    fontFamily: typography.bodyBold,
    color: colors.primary,
    fontSize: 13,
  },
  addBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceContainerHighest,
  },
  favCard: {
    width: 130,
    marginLeft: screen.horizontal,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.soft,
  },
  favImageWrap: {
    width: '100%',
    height: 88,
    position: 'relative',
    backgroundColor: colors.surfaceContainerHighest,
  },
  favImage: { width: '100%', height: '100%' },
  favStatus: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  favHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(30,30,30,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  favName: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 12,
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
