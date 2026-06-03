import { useEffect, useMemo, useState } from "react";
import { useRestaurants } from "./useRestaurants";
import { useCategories } from "./useCategories";
import { usePopularMeals } from "./usePopularMeals";
import { Restaurant } from "../entities/Restaurant";
import { Category } from "../entities/Category";
import { normalizeCuisineKey } from "../utils/categoryMeta";

const HOME_RESTAURANT_LIMIT = 50;

export interface HomeCategory {
  /** Category id from the catalogue, or `null` for the synthetic "All" chip. */
  id: string | null;
  /** Display name from the catalogue (manager-curated). */
  name: string | null;
  /** Manager-provided icon image, if any. */
  iconUrl: string | null;
  /** Canonical cuisine key used to filter restaurants (`null` for "All"). */
  cuisineType: string | null;
  count: number;
}

export const useRestaurantHomeFeed = () => {
  // Base feed: every active restaurant (no cuisine filter). Used for the "All"
  // view and to count restaurants per category.
  const baseQuery = useRestaurants({ limit: HOME_RESTAURANT_LIMIT });

  // Curated category catalogue (name + icon image) from `/categories`.
  const categoriesQuery = useCategories();
  const categoryData = categoriesQuery.data;
  const categoryCatalogue = useMemo<Category[]>(() => categoryData ?? [], [categoryData]);

  const [selectedCuisineType, setSelectedCuisineType] = useState<string | null>(null);

  // Filtered feed: only fires when a specific category is selected. The server
  // does the filtering (`cuisineType` query param on the mobile listing
  // endpoint), so we get the full catalogue for that cuisine — not just the
  // slice already loaded for the base feed.
  const filteredQuery = useRestaurants({
    limit: HOME_RESTAURANT_LIMIT,
    cuisineType: selectedCuisineType ?? undefined,
    enabled: selectedCuisineType !== null,
  });

  const allRestaurants = baseQuery.restaurants;

  // How many loaded restaurants fall under each cuisine key.
  const countByCuisine = useMemo(() => {
    const map = new Map<string, number>();
    for (const restaurant of allRestaurants) {
      if (!restaurant.cuisineType) continue;
      const key = restaurant.cuisineType.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [allRestaurants]);

  const categories = useMemo<HomeCategory[]>(() => {
    const mapped: HomeCategory[] = categoryCatalogue.map((category) => {
      const cuisineType = normalizeCuisineKey(category.name);
      return {
        id: category.id,
        name: category.name,
        iconUrl: category.iconUrl,
        cuisineType,
        count: countByCuisine.get(cuisineType) ?? 0,
      };
    });

    const all: HomeCategory = {
      id: null,
      name: null,
      iconUrl: null,
      cuisineType: null,
      count: baseQuery.total || allRestaurants.length,
    };

    return [all, ...mapped];
  }, [categoryCatalogue, countByCuisine, baseQuery.total, allRestaurants.length]);

  // If the selected cuisine vanishes from the catalogue, fall back to "All".
  useEffect(() => {
    if (selectedCuisineType === null) return;
    if (!categories.length) return;

    const stillExists = categories.some((category) => category.cuisineType === selectedCuisineType);
    if (!stillExists) {
      setSelectedCuisineType(null);
    }
  }, [categories, selectedCuisineType]);

  // Restaurants shown in the section: filtered list when a category is active,
  // otherwise the full base list.
  const filteredRestaurants = useMemo<Restaurant[]>(
    () => (selectedCuisineType ? filteredQuery.restaurants : allRestaurants),
    [selectedCuisineType, filteredQuery.restaurants, allRestaurants],
  );

  // Popular meals: mixed across restaurants. When "All" is active we shuffle for
  // variety; when a category is active we keep meals only from that category's
  // restaurants (no shuffle — featured surfaces first).
  const popular = usePopularMeals(filteredRestaurants, selectedCuisineType === null);

  // The restaurants section is loading when the relevant query is loading: the
  // filtered one when a category is active, otherwise the base one.
  const restaurantsLoading = selectedCuisineType
    ? filteredQuery.isLoading
    : baseQuery.isLoading;

  return {
    restaurants: allRestaurants,
    filteredRestaurants,
    categories,
    totalRestaurants: baseQuery.total,
    popularMeals: popular.meals,
    selectedCuisineType,
    setSelectedCuisineType,
    isLoading: restaurantsLoading,
    isCategoriesLoading: categoriesQuery.isLoading && categoryCatalogue.length === 0,
    isRestaurantsLoading: restaurantsLoading,
    isMealsLoading: popular.isLoading,
    isRefreshing:
      baseQuery.isRefetching ||
      filteredQuery.isRefetching ||
      categoriesQuery.isRefetching,
    isError: baseQuery.isError || filteredQuery.isError,
    refetch: () => {
      baseQuery.refetch();
      categoriesQuery.refetch();
      if (selectedCuisineType) filteredQuery.refetch();
    },
  };
};
