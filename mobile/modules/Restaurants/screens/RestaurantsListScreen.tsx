import React, { useCallback, useMemo, useState } from "react";
import {
  ListRenderItem,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { colors, screen } from "@/components/ui/theme";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useRestaurantsDiscovery } from "../hooks/useRestaurantsDiscovery";
import { Restaurant } from "../entities/Restaurant";
import PremiumRestaurantCard, {
  FeaturedRestaurantCard,
} from "../components/restaurants/PremiumRestaurantCard";
import DiscoveryHeader from "../components/restaurants/DiscoveryHeader";
import SortSheet from "../components/restaurants/SortSheet";
import {
  DiscoverySkeleton,
  DiscoveryEmpty,
} from "../components/restaurants/DiscoveryStates";
import ListErrorState from "../components/ListErrorState";
import ListFooterLoader from "../components/ListFooterLoader";

const keyExtractor = (item: Restaurant) => item.id;

const RestaurantsListScreen = () => {
  const isRTL = useLanguageStore((s) => s.isRTL);
  const [sortOpen, setSortOpen] = useState(false);

  const {
    results,
    total,
    rawCount,
    counts,
    search,
    setSearch,
    debouncedSearch,
    filter,
    setFilter,
    sort,
    setSort,
    isFilteringOrSearching,
    isLoading,
    isFetching,
    isRefetching,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRestaurantsDiscovery();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const handleEndReached = useCallback(() => {
    // Pagination only makes sense for the unfiltered/un-searched feed; a client
    // filter or search already narrows the loaded set.
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePress = useCallback((restaurant: Restaurant) => {
    router.push(`/restaurants/${restaurant.id}` as never);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilter("all");
    setSearch("");
  }, [setFilter, setSearch]);

  // First card is the "featured" hero; the rest are standard — this creates the
  // visual rhythm. Featured only when not actively filtering/searching.
  const showFeatured = !isFilteringOrSearching && results.length > 2;

  const renderItem = useCallback<ListRenderItem<Restaurant>>(
    ({ item, index }) => {
      const isFeatured = showFeatured && index === 0;
      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)}
          layout={LinearTransition.springify().damping(18).stiffness(180)}
        >
          {isFeatured ? (
            <FeaturedRestaurantCard restaurant={item} onPress={handlePress} />
          ) : (
            <PremiumRestaurantCard restaurant={item} onPress={handlePress} />
          )}
        </Animated.View>
      );
    },
    [showFeatured, handlePress],
  );

  // Show the live result count while filtering/searching, else the server total.
  const headerCount = isFilteringOrSearching ? results.length : total;

  const header = useMemo(
    () => (
      <DiscoveryHeader
        scrollY={scrollY}
        total={headerCount}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        filterCounts={counts}
        onFilterChange={setFilter}
        sort={sort}
        onOpenSort={() => setSortOpen(true)}
      />
    ),
    [scrollY, headerCount, search, setSearch, filter, counts, setFilter, sort],
  );

  const showInitialLoader = isLoading && rawCount === 0;
  const showFullScreenError = isError && rawCount === 0;

  const emptyVariant = debouncedSearch
    ? "noResults"
    : filter !== "all"
      ? "noMatches"
      : "empty";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {showFullScreenError ? (
        <ListErrorState
          message={error?.message ?? undefined}
          onRetry={refetch}
          loading={isFetching}
        />
      ) : showInitialLoader ? (
        <>
          {header}
          <DiscoverySkeleton />
        </>
      ) : (
        <Animated.FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onScroll={onScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={header}
          stickyHeaderIndices={[0]}
          ListEmptyComponent={
            <DiscoveryEmpty
              variant={emptyVariant}
              query={debouncedSearch}
              isRTL={isRTL}
              onReset={isFilteringOrSearching ? handleResetFilters : undefined}
            />
          }
          ListFooterComponent={<ListFooterLoader visible={isFetchingNextPage} />}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={9}
        />
      )}

      <SortSheet
        visible={sortOpen}
        value={sort}
        onSelect={setSort}
        onClose={() => setSortOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  listContent: {
    paddingTop: 4,
    paddingBottom: screen.bottomTabSpace + 24,
    flexGrow: 1,
  },
});

export default RestaurantsListScreen;
