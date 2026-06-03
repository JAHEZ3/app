import React, { memo, useCallback } from "react";
import {
    FlatList,
    ListRenderItem,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    FadeIn,
    FadeInDown,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withRepeat,
    withTiming,
    interpolate,
} from "react-native-reanimated";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useFavoriteRestaurants } from "@/modules/Restaurants/hooks/useFavoriteRestaurants";
import { useToggleFavorite } from "@/modules/Restaurants/hooks/useToggleFavorite";
import { Restaurant } from "@/modules/Restaurants/entities/Restaurant";
import { imageSource, formatCuisineType } from "@/modules/Restaurants/utils/foodImages";

const COVER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const CARD_HEIGHT = 132;
const CARD_GAP = 14;
const SKELETONS = ["s0", "s1", "s2", "s3", "s4"];

const t = (isRTL: boolean, en: string, ar: string) => (isRTL ? ar : en);

// ─── Header ──────────────────────────────────────────────────────────────────

function ScreenHeader({ isRTL, count }: { isRTL: boolean; count: number }) {
    const dir = isRTL ? "rtl" : "ltr";
    return (
        <View style={[styles.header, isRTL && styles.rowReverse]}>
            <AnimatedPressable
                onPress={() =>
                    router.canGoBack() ? router.back() : router.replace("/home/Home" as never)
                }
                style={styles.backBtn}
                scaleTo={0.9}
                haptic="selection"
            >
                <Ionicons
                    name={isRTL ? "chevron-forward" : "chevron-back"}
                    size={22}
                    color={colors.onSurface}
                />
            </AnimatedPressable>

            <View style={{ flex: 1 }}>
                <Text style={[styles.headerEyebrow, { writingDirection: dir }]}>
                    {t(isRTL, "Your collection", "مجموعتك")}
                </Text>
                <View style={[styles.headerTitleRow, isRTL && styles.rowReverse]}>
                    <Text style={[styles.headerTitle, { writingDirection: dir }]}>
                        {t(isRTL, "Favorites", "المفضلة")}
                    </Text>
                    {count > 0 ? (
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{count}</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <View style={styles.headerIconWrap}>
                <Ionicons name="heart" size={20} color={colors.primary} />
            </View>
        </View>
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ isRTL }: { isRTL: boolean }) {
    const dir = isRTL ? "rtl" : "ltr";

    // Gentle breathing pulse behind the heart for a touch of life.
    const pulse = useSharedValue(0);
    React.useEffect(() => {
        pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, true);
    }, [pulse]);
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 0.9 + pulse.value * 0.18 }],
        opacity: 0.18 + pulse.value * 0.12,
    }));

    return (
        <Animated.View entering={FadeIn.duration(420)} style={styles.emptyWrap}>
            <View style={styles.emptyIconStack}>
                <Animated.View style={[styles.emptyPulse, pulseStyle]} />
                <View style={styles.emptyIcon}>
                    <Ionicons name="heart" size={42} color={colors.primary} />
                </View>
            </View>
            <Text style={[styles.emptyTitle, { writingDirection: dir }]}>
                {t(isRTL, "No favorites yet", "لا توجد مفضلات بعد")}
            </Text>
            <Text style={[styles.emptySubtitle, { writingDirection: dir }]}>
                {t(
                    isRTL,
                    "Tap the heart on any restaurant to save it here for quick, one-tap ordering.",
                    "اضغط على القلب في أي مطعم لحفظه هنا والطلب منه بسرعة بضغطة واحدة.",
                )}
            </Text>
            <AnimatedPressable
                onPress={() => router.replace("/restaurants" as never)}
                style={styles.browseBtn}
                scaleTo={0.96}
                haptic="impact"
            >
                <Ionicons name="compass-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.browseBtnText}>
                    {t(isRTL, "Explore restaurants", "استكشف المطاعم")}
                </Text>
            </AnimatedPressable>
        </Animated.View>
    );
}

// ─── Loading skeleton (matches the real card) ────────────────────────────────

function SkeletonShimmer({ style }: { style?: any }) {
    const progress = useSharedValue(0);
    React.useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    }, [progress]);
    const animated = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 1, 0.5]),
    }));
    return <Animated.View style={[styles.skelBlock, animated, style]} />;
}

function FavoriteSkeleton() {
    return (
        <View style={styles.card}>
            <SkeletonShimmer style={styles.skelThumb} />
            <View style={styles.skelBody}>
                <SkeletonShimmer style={styles.skelLineWide} />
                <SkeletonShimmer style={styles.skelLineNarrow} />
                <View style={styles.skelChips}>
                    <SkeletonShimmer style={styles.skelChip} />
                    <SkeletonShimmer style={styles.skelChip} />
                </View>
            </View>
        </View>
    );
}

// ─── Premium favorite card ───────────────────────────────────────────────────

const FavoriteCard = memo(function FavoriteCard({
    restaurant,
    onToggle,
    onPress,
    isRTL,
}: {
    restaurant: Restaurant;
    onToggle: (r: Restaurant) => void;
    onPress: (r: Restaurant) => void;
    isRTL: boolean;
}) {
    const dir = isRTL ? "rtl" : "ltr";

    // Heart pop when this card mounts already-favorited it's filled instantly;
    // the pop plays on the tap that removes it for tactile feedback.
    const heartScale = useSharedValue(1);
    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const handleToggle = useCallback(() => {
        heartScale.value = withSpring(1.35, { damping: 5, stiffness: 320 }, () => {
            heartScale.value = withSpring(1, { damping: 9, stiffness: 260 });
        });
        onToggle(restaurant);
    }, [onToggle, restaurant, heartScale]);

    const handlePress = useCallback(() => onPress(restaurant), [onPress, restaurant]);

    return (
        <AnimatedPressable
            onPress={handlePress}
            haptic="selection"
            scaleTo={0.985}
            style={[styles.card, isRTL && styles.rowReverse]}
        >
            {/* Image with gradient + status */}
            <View style={styles.thumb}>
                <Image
                    source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
                    placeholder={COVER_BLURHASH}
                    contentFit="cover"
                    transition={220}
                    style={styles.thumbImage}
                />
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.45)"]}
                    style={styles.thumbScrim}
                />
                <View
                    style={[
                        styles.statusPill,
                        { backgroundColor: restaurant.isOpen ? "rgba(22,163,74,0.95)" : "rgba(82,82,82,0.92)" },
                    ]}
                >
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>
                        {restaurant.isOpen ? t(isRTL, "Open", "مفتوح") : t(isRTL, "Closed", "مغلق")}
                    </Text>
                </View>
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.name, { writingDirection: dir }]} numberOfLines={1}>
                    {restaurant.name}
                </Text>
                <Text style={[styles.cuisine, { writingDirection: dir }]} numberOfLines={1}>
                    {formatCuisineType(restaurant.cuisineType)}
                    {restaurant.city ? `  ·  ${restaurant.city}` : ""}
                </Text>

                <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
                    <View style={styles.ratingChip}>
                        <Ionicons name="star" size={11} color="#D68A00" />
                        <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                        <Text style={styles.ratingCount}>({restaurant.totalRatings})</Text>
                    </View>
                    <View style={styles.minChip}>
                        <Ionicons name="bag-handle-outline" size={11} color={colors.primary} />
                        <Text style={styles.minText}>
                            {t(isRTL, "Min", "الحد")} {restaurant.minOrderAmount.toFixed(0)} ILS
                        </Text>
                    </View>
                </View>
            </View>

            {/* Heart toggle */}
            <AnimatedPressable
                onPress={handleToggle}
                haptic="none"
                scaleTo={0.85}
                style={styles.heartBtn}
                containerStyle={styles.heartHit}
                hitSlop={10}
            >
                <Animated.View style={heartStyle}>
                    <Ionicons name="heart" size={20} color={colors.primary} />
                </Animated.View>
            </AnimatedPressable>
        </AnimatedPressable>
    );
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
    const isRTL = useLanguageStore((s) => s.isRTL);

    const { data: restaurants, isLoading } = useFavoriteRestaurants();
    const { mutate: toggleFavorite } = useToggleFavorite();

    const handleToggle = useCallback(
        (restaurant: Restaurant) => toggleFavorite(restaurant),
        [toggleFavorite],
    );

    const handleOpen = useCallback(
        (restaurant: Restaurant) => router.push(`/restaurants/${restaurant.id}` as never),
        [],
    );

    const renderItem: ListRenderItem<Restaurant> = useCallback(
        ({ item, index }) => (
            <Animated.View
                entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(320)}
                layout={LinearTransition.springify().damping(18).stiffness(180)}
            >
                <FavoriteCard
                    restaurant={item}
                    onToggle={handleToggle}
                    onPress={handleOpen}
                    isRTL={isRTL}
                />
            </Animated.View>
        ),
        [handleToggle, handleOpen, isRTL],
    );

    const keyExtractor = useCallback((item: Restaurant) => item.id, []);

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <ScreenHeader isRTL={isRTL} count={restaurants.length} />

            {isLoading ? (
                <View style={styles.skeletonWrap}>
                    {SKELETONS.map((k) => (
                        <FavoriteSkeleton key={k} />
                    ))}
                </View>
            ) : restaurants.length === 0 ? (
                <EmptyState isRTL={isRTL} />
            ) : (
                <FlatList
                    data={restaurants}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={9}
                />
            )}

            <FloatingTabBar />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: screen.horizontal,
        paddingTop: 10,
        paddingBottom: 16,
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
    headerEyebrow: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.3,
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 25,
        lineHeight: 32,
    },
    countBadge: {
        minWidth: 24,
        height: 24,
        paddingHorizontal: 7,
        borderRadius: 12,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    countBadgeText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 12,
    },
    headerIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },

    // List
    list: {
        paddingTop: 4,
        paddingHorizontal: screen.horizontal,
        paddingBottom: screen.bottomTabSpace + 24,
        gap: CARD_GAP,
    },
    skeletonWrap: {
        flex: 1,
        paddingTop: 4,
        paddingHorizontal: screen.horizontal,
        gap: CARD_GAP,
    },

    // Empty state
    emptyWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 14,
        paddingBottom: screen.bottomTabSpace,
    },
    emptyIconStack: {
        width: 120,
        height: 120,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    emptyPulse: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary,
    },
    emptyIcon: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 20,
        textAlign: "center",
        lineHeight: 26,
    },
    emptySubtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13.5,
        lineHeight: 20,
        textAlign: "center",
        maxWidth: 300,
    },
    browseBtn: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 24,
        height: 52,
        borderRadius: radii.pill,
        backgroundColor: colors.primary,
        ...shadows.primary,
    },
    browseBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 15,
    },

    // Card
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        height: CARD_HEIGHT,
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        padding: 12,
        ...shadows.soft,
    },
    thumb: {
        width: 108,
        height: 108,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: colors.surfaceContainerHighest,
        flexShrink: 0,
    },
    thumbImage: {
        width: "100%",
        height: "100%",
    },
    thumbScrim: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "55%",
    },
    statusPill: {
        position: "absolute",
        bottom: 8,
        left: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: radii.pill,
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
    info: {
        flex: 1,
        gap: 4,
        justifyContent: "center",
    },
    name: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 16,
        lineHeight: 21,
    },
    cuisine: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
        flexWrap: "wrap",
    },
    ratingChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    ratingText: {
        fontFamily: typography.bodyBold,
        color: "#92400E",
        fontSize: 11,
    },
    ratingCount: {
        fontFamily: typography.body,
        color: "#A16207",
        fontSize: 10,
    },
    minChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: colors.faintPrimary,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    minText: {
        fontFamily: typography.bodyBold,
        color: colors.primary,
        fontSize: 11,
    },
    heartHit: {
        flexShrink: 0,
    },
    heartBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
    },

    // Skeleton
    skelBlock: {
        backgroundColor: "#E7E7E9",
        borderRadius: 8,
    },
    skelThumb: {
        width: 108,
        height: 108,
        borderRadius: 18,
    },
    skelBody: {
        flex: 1,
        gap: 9,
        justifyContent: "center",
    },
    skelLineWide: { width: "70%", height: 16, borderRadius: 6 },
    skelLineNarrow: { width: "45%", height: 12, borderRadius: 6 },
    skelChips: { flexDirection: "row", gap: 8, marginTop: 4 },
    skelChip: { width: 64, height: 22, borderRadius: 8 },
});
