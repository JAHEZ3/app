import React, { useCallback } from "react";
import {
    FlatList,
    ListRenderItem,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useFavoriteRestaurants } from "@/modules/Restaurants/hooks/useFavoriteRestaurants";
import { useFavorites } from "@/modules/Restaurants/hooks/useFavorites";
import { useToggleFavorite } from "@/modules/Restaurants/hooks/useToggleFavorite";
import { Restaurant } from "@/modules/Restaurants/entities/Restaurant";
import { imageSource, formatCuisineType } from "@/modules/Restaurants/utils/foodImages";
import RestaurantCardSkeleton from "@/modules/Restaurants/components/RestaurantCardSkeleton";

const COVER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const SKELETONS = Array.from({ length: 4 }, (_, i) => `sk-${i}`);

// ─── Header ──────────────────────────────────────────────────────────────────

function ScreenHeader({ isRTL }: { isRTL: boolean }) {
    const dir = isRTL ? "rtl" : "ltr";
    return (
        <View style={[styles.header, isRTL && styles.rowReverse]}>
            <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/home/Home" as never))}
                style={styles.backBtn}
                hitSlop={8}
            >
                <Ionicons
                    name={isRTL ? "chevron-forward" : "chevron-back"}
                    size={22}
                    color={colors.onSurface}
                />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
                <Text style={[styles.headerEyebrow, { writingDirection: dir }]}>
                    {isRTL ? "مطاعمك" : "Your restaurants"}
                </Text>
                <Text style={[styles.headerTitle, { writingDirection: dir }]}>
                    {isRTL ? "المحفوظات" : "Saved"}
                </Text>
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
    return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={44} color={colors.outline} />
            </View>
            <Text style={[styles.emptyTitle, { writingDirection: dir }]}>
                {isRTL ? "لا توجد مطاعم محفوظة" : "No saved restaurants yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { writingDirection: dir }]}>
                {isRTL
                    ? "اضغط على قلب أي مطعم لحفظه وإيجاده هنا بسرعة."
                    : "Tap the heart on any restaurant to save it here for quick access."}
            </Text>
            <AnimatedPressable
                onPress={() => router.replace("/restaurants" as never)}
                style={styles.browseBtn}
                scaleTo={0.96}
                haptic="impact"
            >
                <Ionicons name="storefront-outline" size={16} color={colors.onPrimary} />
                <Text style={styles.browseBtnText}>
                    {isRTL ? "استعرض المطاعم" : "Browse restaurants"}
                </Text>
            </AnimatedPressable>
        </Animated.View>
    );
}

// ─── Restaurant row card ─────────────────────────────────────────────────────

function FavoriteRow({
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
    const dir = isRTL ? "rtl" : "ltr";

    return (
        <AnimatedPressable
            onPress={onPress}
            haptic="impact"
            scaleTo={0.98}
            style={[styles.row, isRTL && styles.rowReverse]}
        >
            {/* Cover thumbnail */}
            <View style={styles.rowThumb}>
                <Image
                    source={imageSource(restaurant.coverUrl || restaurant.logoUrl, restaurant.cuisineType)}
                    placeholder={COVER_BLURHASH}
                    contentFit="cover"
                    transition={200}
                    style={styles.rowThumbImage}
                />
                <View
                    style={[
                        styles.rowStatusDot,
                        { backgroundColor: restaurant.isOpen ? "#16A34A" : "#9CA3AF" },
                        isRTL ? styles.rowStatusDotRTL : styles.rowStatusDotLTR,
                    ]}
                />
            </View>

            {/* Info */}
            <View style={styles.rowInfo}>
                <Text
                    style={[styles.rowName, { writingDirection: dir }]}
                    numberOfLines={1}
                >
                    {restaurant.name}
                </Text>
                <Text
                    style={[styles.rowCuisine, { writingDirection: dir }]}
                    numberOfLines={1}
                >
                    {formatCuisineType(restaurant.cuisineType)}
                </Text>
                <View style={[styles.rowMeta, isRTL && styles.rowReverse]}>
                    <View style={styles.ratingChip}>
                        <Ionicons name="star" size={11} color="#D68A00" />
                        <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
                        <Text style={styles.ratingCount}>({restaurant.totalRatings})</Text>
                    </View>
                    <View style={styles.minChip}>
                        <Ionicons name="cart-outline" size={11} color={colors.primary} />
                        <Text style={styles.minText}>
                            {`${restaurant.minOrderAmount.toFixed(0)} ILS`}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.openChip,
                            { backgroundColor: restaurant.isOpen ? "#DCFCE7" : "#F3F4F6" },
                        ]}
                    >
                        <Text
                            style={[
                                styles.openText,
                                { color: restaurant.isOpen ? "#16A34A" : "#9CA3AF" },
                            ]}
                        >
                            {restaurant.isOpen
                                ? (isRTL ? "مفتوح" : "Open")
                                : (isRTL ? "مغلق" : "Closed")}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Heart toggle */}
            <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onToggle(); }}
                style={[styles.heartBtn, isFavorited && styles.heartBtnActive]}
                hitSlop={8}
                activeOpacity={0.8}
            >
                <Ionicons
                    name={isFavorited ? "heart" : "heart-outline"}
                    size={18}
                    color={isFavorited ? colors.primary : colors.outline}
                />
            </TouchableOpacity>
        </AnimatedPressable>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
    const isRTL = useLanguageStore((s) => s.isRTL);
    const dir = isRTL ? "rtl" : "ltr";

    const { data: restaurants = [], isLoading, refetch, isRefetching } = useFavoriteRestaurants();
    const { isFavorite } = useFavorites();
    const { mutate: toggleFavorite } = useToggleFavorite();

    const handleToggle = useCallback(
        (restaurant: Restaurant) => {
            toggleFavorite({ restaurantId: restaurant.id, isFavorite: isFavorite(restaurant.id) });
        },
        [toggleFavorite, isFavorite],
    );

    const renderItem: ListRenderItem<Restaurant> = useCallback(
        ({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(320)}>
                <FavoriteRow
                    restaurant={item}
                    isFavorited={isFavorite(item.id)}
                    onToggle={() => handleToggle(item)}
                    onPress={() => router.push(`/restaurants/${item.id}` as never)}
                    isRTL={isRTL}
                />
            </Animated.View>
        ),
        [isFavorite, handleToggle, isRTL],
    );

    const ListHeader = useCallback(
        () => (
            <Text style={[styles.countLabel, { writingDirection: dir, textAlign: isRTL ? "right" : "left" }]}>
                {restaurants.length > 0
                    ? (isRTL
                        ? `${restaurants.length} ${restaurants.length === 1 ? "مطعم محفوظ" : "مطاعم محفوظة"}`
                        : `${restaurants.length} saved restaurant${restaurants.length === 1 ? "" : "s"}`)
                    : ""}
            </Text>
        ),
        [restaurants.length, isRTL, dir],
    );

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

            <ScreenHeader isRTL={isRTL} />

            {isLoading ? (
                <View style={styles.skeletonWrap}>
                    {SKELETONS.map((k) => (
                        <RestaurantCardSkeleton key={k} />
                    ))}
                </View>
            ) : restaurants.length === 0 ? (
                <EmptyState isRTL={isRTL} />
            ) : (
                <FlatList
                    data={restaurants}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
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
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceContainer,
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
        color: colors.outline,
        fontSize: 11,
        lineHeight: 14,
    },
    headerTitle: {
        fontFamily: typography.headline,
        color: colors.onSurface,
        fontSize: 24,
        lineHeight: 30,
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
        paddingTop: 12,
        paddingBottom: screen.bottomTabSpace + 24,
        gap: 0,
    },
    countLabel: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 12,
        marginHorizontal: screen.horizontal,
        marginBottom: 8,
    },
    skeletonWrap: {
        flex: 1,
        paddingTop: 12,
    },

    // Empty state
    emptyWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 12,
        paddingBottom: screen.bottomTabSpace,
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.faintPrimary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    emptyTitle: {
        fontFamily: typography.headlineSemi,
        color: colors.onSurface,
        fontSize: 18,
        textAlign: "center",
        lineHeight: 24,
    },
    emptySubtitle: {
        fontFamily: typography.bodyMedium,
        color: colors.outline,
        fontSize: 13,
        lineHeight: 19,
        textAlign: "center",
    },
    browseBtn: {
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
    browseBtnText: {
        fontFamily: typography.bodyBold,
        color: colors.onPrimary,
        fontSize: 14,
    },

    // Row card
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        marginHorizontal: screen.horizontal,
        marginBottom: 12,
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        padding: 12,
        ...shadows.soft,
    },
    rowThumb: {
        width: 72,
        height: 72,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.surfaceContainerHighest,
        position: "relative",
        flexShrink: 0,
    },
    rowThumbImage: {
        width: "100%",
        height: "100%",
    },
    rowStatusDot: {
        position: "absolute",
        bottom: 6,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: colors.card,
    },
    rowStatusDotLTR: { left: 6 },
    rowStatusDotRTL: { right: 6 },
    rowInfo: {
        flex: 1,
        gap: 3,
    },
    rowName: {
        fontFamily: typography.bodyBold,
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 20,
    },
    rowCuisine: {
        fontFamily: typography.body,
        color: colors.outline,
        fontSize: 12,
    },
    rowMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        marginTop: 4,
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
    openChip: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    openText: {
        fontFamily: typography.bodyBold,
        fontSize: 11,
    },
    heartBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.surfaceContainer,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    heartBtnActive: {
        backgroundColor: colors.faintPrimary,
    },
});
