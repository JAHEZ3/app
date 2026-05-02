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
import { useRestaurantHomeFeed } from "@/modules/Restaurants/hooks/useRestaurantHomeFeed";
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
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { getCartQuantity, useCartStore } from "@/store/useCartStore";
import { useLanguageStore } from "@/store/useLanguageStore";

const IMAGE_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

const formatPrice = (value: number, currency = "SAR") =>
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
  const { language } = useLanguageStore();
  const isArabic = language === "ar";
  const focus = useSharedValue(0);

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.58)"],
    ),
    transform: [{ scale: 1 + focus.value * 0.012 }],
  }));

  const textAlign = isArabic ? "right" : "left";

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroShapeLarge} />
      <View style={styles.heroShapeSmall} />

      <View style={styles.heroTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroGreeting, { textAlign }]}>
            {t(`greeting.${getGreetingKey()}`)}
          </Text>
          <Text style={[styles.heroName, { textAlign }]} numberOfLines={1}>
            {firstName}
          </Text>
        </View>

        <View style={styles.heroActions}>
          <AnimatedPressable style={styles.heroIconButton} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={18} color={colors.onPrimary} />
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => router.navigate("/cart" as never)}
            style={styles.heroIconButton}
            accessibilityLabel="Cart"
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

      <View style={[styles.heroMainRow, isArabic && styles.heroMainRowRtl]}>
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

      <Animated.View style={[styles.heroSearch, searchAnimatedStyle]}>
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
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <AnimatedPressable onPress={onAction} haptic="selection">
          <Text style={styles.sectionAction}>{action}</Text>
        </AnimatedPressable>
      ) : action ? (
        <Text style={styles.sectionMutedAction} numberOfLines={1}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

function CategoryCard({
  cuisineType,
  count,
  imageUrl,
  selected,
  onPress,
}: {
  cuisineType: string;
  count: number;
  imageUrl?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="impact"
      style={[styles.categoryCard, selected && styles.categoryCardSelected]}
    >
      <Image
        source={imageSource(imageUrl, cuisineType)}
        placeholder={IMAGE_BLURHASH}
        contentFit="cover"
        transition={220}
        style={styles.categoryImage}
      />
      <LinearGradient
        colors={selected ? ["rgba(245,89,5,0.2)", "rgba(245,89,5,0.88)"] : ["rgba(30,30,30,0.02)", "rgba(30,30,30,0.55)"]}
        style={styles.categoryOverlay}
      />
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle} numberOfLines={1}>
          {formatCuisineType(cuisineType)}
        </Text>
        <Text style={styles.categoryCount}>{count} place{count === 1 ? "" : "s"}</Text>
      </View>
    </AnimatedPressable>
  );
}

function RestaurantPreviewCard({ restaurant }: { restaurant: Restaurant }) {
  const handlePress = () => router.push(`/restaurants/${restaurant.id}` as never);

  return (
    <AnimatedPressable onPress={handlePress} haptic="impact" style={styles.restaurantCard}>
      <View style={styles.restaurantImageWrap}>
        <Image
          source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
          placeholder={IMAGE_BLURHASH}
          contentFit="cover"
          transition={220}
          style={styles.restaurantImage}
        />
        <View
          style={[
            styles.statusBadge,
            restaurant.isOpen ? styles.openBadge : styles.closedBadge,
          ]}
        >
          <View style={styles.statusDot} />
          <Text style={styles.statusBadgeText}>{restaurant.isOpen ? "Open" : "Closed"}</Text>
        </View>
      </View>

      <View style={styles.restaurantBody}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={styles.restaurantCuisine} numberOfLines={1}>
          {formatCuisineType(restaurant.cuisineType)}
        </Text>
        <View style={styles.restaurantMetaRow}>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color="#D68A00" />
            <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.minOrderText}>
            Min {restaurant.minOrderAmount.toFixed(0)} SAR
          </Text>
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
        <Text style={styles.mealPreviewName} numberOfLines={2}>
          {meal.name}
        </Text>
        <View style={styles.mealPreviewFooter}>
          <Text style={styles.mealPreviewPrice}>{formatPrice(meal.price)}</Text>
          <View style={styles.addBubble}>
            <Ionicons name="add" size={16} color={colors.onPrimary} />
          </View>
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

function EmptySection({ text }: { text: string }) {
  return (
    <View style={styles.emptySection}>
      <View style={styles.emptyIcon}>
        <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function HomeScreen() {
  const { width } = useWindowDimensions();
  const { data: profile } = useGetProfile();
  const feed = useRestaurantHomeFeed();
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);
  const [search, setSearch] = useState("");

  const cartCount = getCartQuantity(cartItems);
  const firstName = profile?.firstName?.trim() || "Guest";
  const mealCardWidth = Math.min(width * 0.42, 172);
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
        .slice(0, 3),
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
    (cuisineType: string) => {
      feed.setSelectedCuisineType(cuisineType);
    },
    [feed],
  );

  const handleConfirmMeal = useCallback(
    (result: MealSelectionResult) => {
      addItem(result);
      setActiveMeal(null);
    },
    [addItem],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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

        <FadeInView delay={130}>
          <SectionHeader title="Categories" />
          {feed.isLoading && !feed.categories.length ? (
            <RailSkeleton count={4} width={116} height={118} />
          ) : feed.categories.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRail}
            >
              {feed.categories.map((category, index) => (
                <FadeInView key={category.cuisineType} delay={170 + index * 45}>
                  <CategoryCard
                    cuisineType={category.cuisineType}
                    count={category.count}
                    imageUrl={category.imageUrl}
                    selected={category.cuisineType === feed.selectedCuisineType}
                    onPress={() => handleCategoryPress(category.cuisineType)}
                  />
                </FadeInView>
              ))}
            </ScrollView>
          ) : (
            <EmptySection text="No categories available yet." />
          )}
        </FadeInView>

        <FadeInView delay={230}>
          <SectionHeader
            title="Restaurants"
            action="See All"
            onAction={() => router.push("/restaurants" as never)}
          />
          {feed.isLoading && !restaurantPreview.length ? (
            <RailSkeleton count={3} width={166} height={202} />
          ) : restaurantPreview.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              decelerationRate="fast"
            >
              {restaurantPreview.map((restaurant, index) => (
                <FadeInView key={restaurant.id} delay={260 + index * 55}>
                  <RestaurantPreviewCard restaurant={restaurant} />
                </FadeInView>
              ))}
            </ScrollView>
          ) : (
            <EmptySection text="No restaurants in this category." />
          )}
        </FadeInView>

        <FadeInView delay={320}>
          <SectionHeader
            title="Popular Meals"
            action={feed.selectedRestaurant?.name}
          />
          {feed.isLoading && !popularMeals.length ? (
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
            <EmptySection text="No meals to show for this restaurant yet." />
          )}
        </FadeInView>
      </ScrollView>

      <FloatingTabBar />

      <MealOptionsModal
        visible={!!activeMeal}
        meal={activeMeal}
        onClose={() => setActiveMeal(null)}
        onConfirm={handleConfirmMeal}
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
    marginBottom: 11,
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
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
    gap: 12,
    paddingBottom: 24,
  },
  categoryCard: {
    width: 118,
    height: 118,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...shadows.soft,
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.primary,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryContent: {
    position: "absolute",
    left: 11,
    right: 11,
    bottom: 10,
  },
  categoryTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onPrimary,
    fontSize: 15,
    lineHeight: 19,
  },
  categoryCount: {
    marginTop: 2,
    fontFamily: typography.bodyMedium,
    color: "rgba(255,255,255,0.84)",
    fontSize: 11,
  },
  rail: {
    paddingHorizontal: screen.horizontal,
    gap: 14,
    paddingBottom: 26,
  },
  restaurantCard: {
    width: 166,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    overflow: "hidden",
    ...shadows.soft,
  },
  restaurantImageWrap: {
    height: 114,
    backgroundColor: colors.surfaceContainer,
    position: "relative",
  },
  restaurantImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  openBadge: {
    backgroundColor: "rgba(22,163,74,0.9)",
  },
  closedBadge: {
    backgroundColor: "rgba(118,119,119,0.9)",
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
  restaurantBody: {
    padding: 12,
    gap: 5,
  },
  restaurantName: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 20,
  },
  restaurantCuisine: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  restaurantMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
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
  minOrderText: {
    flex: 1,
    textAlign: "right",
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 11,
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
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    flex: 1,
    fontFamily: typography.bodyMedium,
    color: colors.outline,
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
