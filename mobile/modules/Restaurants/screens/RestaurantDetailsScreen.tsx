import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
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
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import { colors, radii, screen, shadows, typography } from "@/components/ui/theme";
import { useCartStore } from "@/store/useCartStore";
import { useRestaurantDetails } from "../hooks/useRestaurantDetails";
import { useRestaurantMenus } from "../hooks/useRestaurantMenus";
import { useMenuSections } from "../hooks/useMenuSections";
import { RestaurantDetails } from "../entities/RestaurantDetails";
import { MenuSection } from "../entities/MenuSection";
import { formatCuisineType, imageSource } from "../utils/foodImages";
import DetailsHeroSkeleton from "../components/DetailsHeroSkeleton";
import ListErrorState from "../components/ListErrorState";
import MenuTabs from "../components/MenuTabs";
import MealsList from "../components/MealsList";

const COVER_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

const formatAddress = (restaurant: RestaurantDetails) => {
  if (restaurant.address) return restaurant.address;
  const parts = [restaurant.street, restaurant.city].filter(Boolean);
  return parts.length ? parts.join(", ") : restaurant.city;
};

const formatPrice = (value: number) => `${value.toFixed(value % 1 === 0 ? 0 : 2)} SAR`;

function StatChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SectionTabs({
  sections,
  selectedSectionId,
  onSelect,
  isLoading,
}: {
  sections: MenuSection[];
  selectedSectionId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionTabsRow}
      >
        {[112, 94, 128].map((width) => (
          <View key={width} style={[styles.sectionTabSkeleton, { width }]} />
        ))}
      </ScrollView>
    );
  }

  if (!sections.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sectionTabsRow}
    >
      {sections.map((section) => {
        const selected = section.id === selectedSectionId;
        return (
          <AnimatedPressable
            key={section.id}
            onPress={() => onSelect(section.id)}
            style={[styles.sectionTab, selected && styles.sectionTabSelected]}
          >
            <Text style={[styles.sectionTabText, selected && styles.sectionTabTextSelected]} numberOfLines={1}>
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
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const RestaurantDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const addCartItem = useCartStore((state) => state.addItem);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.loadingTopBar}>
          <AnimatedPressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
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
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </AnimatedPressable>
        </View>
        <ListErrorState
          title="Couldn't load restaurant"
          message={error?.message ?? "Please try again in a moment."}
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.onSurface} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.heroWrap}>
          <Image
            source={imageSource(coverUrl, cuisineType)}
            placeholder={COVER_BLURHASH}
            contentFit="cover"
            transition={250}
            style={styles.cover}
          />
          <LinearGradient
            colors={["rgba(30,30,30,0.12)", "rgba(30,30,30,0.62)"]}
            style={styles.coverScrim}
          />

          <View style={styles.topBarOverlay}>
            <AnimatedPressable onPress={handleBack} style={styles.overlayIconButton}>
              <Ionicons name="chevron-back" size={22} color={colors.onPrimary} />
            </AnimatedPressable>
            <AnimatedPressable style={styles.overlayIconButton}>
              <Ionicons name="heart-outline" size={20} color={colors.onPrimary} />
            </AnimatedPressable>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.logoWrap}>
              <Image
                source={imageSource(logoUrl, cuisineType)}
                contentFit="cover"
                transition={150}
                style={styles.logo}
              />
            </View>
            <View style={styles.heroCopy}>
              <View
                style={[
                  styles.heroStatus,
                  isOpen ? styles.openStatus : styles.closedStatus,
                ]}
              >
                <View style={styles.statusDot} />
                <Text style={styles.heroStatusText}>{isOpen ? "Open now" : "Closed"}</Text>
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.cuisineText}>{formatCuisineType(cuisineType)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.metaCard}>
            <StatChip icon="star" label="Rating" value={`${rating.toFixed(1)} (${totalRatings})`} />
            <View style={styles.metaDivider} />
            <StatChip icon="cart-outline" label="Min order" value={formatPrice(minOrderAmount)} />
            {estimatedDeliveryTime != null ? (
              <>
                <View style={styles.metaDivider} />
                <StatChip icon="time-outline" label="ETA" value={`${estimatedDeliveryTime} min`} />
              </>
            ) : null}
          </View>

          {description ? (
            <View style={styles.aboutBlock}>
              <Text style={styles.blockTitle}>About</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.menuBlock}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Menus</Text>
            <Text style={styles.blockMeta}>
              {menus.length ? `${menus.length} menu${menus.length === 1 ? "" : "s"}` : ""}
            </Text>
          </View>
          <MenuTabs
            menus={menus}
            selectedMenuId={selectedMenuId}
            onSelect={selectMenu}
            isLoading={menusLoading}
            isError={menusError}
            onRetry={refetchMenus}
          />

          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Sections</Text>
            <Text style={styles.blockMeta}>
              {sections.length ? `${sections.length} section${sections.length === 1 ? "" : "s"}` : ""}
            </Text>
          </View>
          <SectionTabs
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelect={setSelectedSectionId}
            isLoading={sectionsLoading}
          />
        </View>

        <MealsList
          sections={activeSection ? [activeSection] : []}
          isLoading={sectionsLoading}
          isError={sectionsError}
          onRetry={refetchSections}
          onAddToCart={addCartItem}
          showSectionHeaders={false}
        />

        <View style={styles.infoSection}>
          <Text style={styles.blockTitle}>Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="location-outline" label="Address" value={address} />
            <View style={styles.infoDivider} />
            <InfoRow
              icon={isOpen ? "checkmark-circle-outline" : "close-circle-outline"}
              label="Status"
              value={isOpen ? "Open now" : "Currently closed"}
            />
            {deliveryFee != null ? (
              <>
                <View style={styles.infoDivider} />
                <InfoRow icon="bicycle-outline" label="Delivery fee" value={formatPrice(deliveryFee)} />
              </>
            ) : null}
            {openingHours ? (
              <>
                <View style={styles.infoDivider} />
                <InfoRow icon="time-outline" label="Hours" value={openingHours} />
              </>
            ) : null}
            {phone ? (
              <>
                <View style={styles.infoDivider} />
                <InfoRow icon="call-outline" label="Phone" value={phone} />
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <FloatingTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
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
  heroWrap: {
    width: "100%",
    height: 300,
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    backgroundColor: colors.surfaceContainerHighest,
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  topBarOverlay: {
    position: "absolute",
    top: 14,
    left: screen.horizontal,
    right: screen.horizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overlayIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(30,30,30,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    position: "absolute",
    left: screen.horizontal,
    right: screen.horizontal,
    bottom: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 13,
  },
  logoWrap: {
    width: 76,
    height: 76,
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
  heroCopy: {
    flex: 1,
    gap: 5,
  },
  heroStatus: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  openStatus: {
    backgroundColor: "rgba(22,163,74,0.9)",
  },
  closedStatus: {
    backgroundColor: "rgba(118,119,119,0.9)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onPrimary,
  },
  heroStatusText: {
    fontFamily: typography.bodyBold,
    color: colors.onPrimary,
    fontSize: 11,
  },
  name: {
    fontFamily: typography.headline,
    color: colors.onPrimary,
    fontSize: 28,
    lineHeight: 34,
  },
  cuisineText: {
    fontFamily: typography.bodyMedium,
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
  },
  content: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 18,
    gap: 18,
  },
  metaCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 12,
    gap: 10,
    ...shadows.soft,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.faintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 11,
  },
  statValue: {
    fontFamily: typography.bodyBold,
    color: colors.onSurface,
    fontSize: 14,
    marginTop: 1,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginLeft: 46,
  },
  aboutBlock: {
    gap: 7,
  },
  blockTitle: {
    fontFamily: typography.headlineSemi,
    color: colors.onSurface,
    fontSize: 18,
  },
  blockMeta: {
    fontFamily: typography.bodyMedium,
    color: colors.outline,
    fontSize: 12,
  },
  description: {
    fontFamily: typography.body,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 20,
  },
  menuBlock: {
    paddingTop: 22,
    gap: 10,
  },
  blockHeader: {
    paddingHorizontal: screen.horizontal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTabsRow: {
    paddingHorizontal: screen.horizontal,
    gap: 10,
    paddingBottom: 8,
  },
  sectionTab: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
  },
  sectionTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.primary,
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
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sectionCountSelected: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  sectionCountText: {
    fontFamily: typography.bodyBold,
    color: colors.outline,
    fontSize: 11,
  },
  sectionCountTextSelected: {
    color: colors.onPrimary,
  },
  sectionTabSkeleton: {
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
  infoSection: {
    paddingHorizontal: screen.horizontal,
    paddingTop: 24,
    gap: 10,
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
    marginHorizontal: 12,
    marginLeft: 60,
  },
});

export default RestaurantDetailsScreen;
