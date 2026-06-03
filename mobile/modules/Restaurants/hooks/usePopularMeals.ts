import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRestaurantsRepository } from "..";
import { Meal } from "../entities/Meal";
import { Restaurant } from "../entities/Restaurant";

export const POPULAR_MEALS_QUERY_KEY = "popularMeals";

/** How many restaurants we pull meals from to build the rail. */
const SOURCE_RESTAURANT_LIMIT = 6;
/** Max meals taken from any single restaurant, so one place can't dominate. */
const MAX_PER_RESTAURANT = 4;

export interface PopularMeal {
  meal: Meal;
  restaurant: Restaurant;
}

/**
 * Deterministic shuffle seeded by a key so the order is stable within a render
 * pass (no flicker on re-render) but changes when the source set changes.
 */
const seededShuffle = <T,>(items: T[], seed: string): T[] => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    h = (Math.imul(h, 48271) + 1) & 0x7fffffff;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Builds the "Popular Meals" rail by pulling meals from several restaurants and
 * combining them:
 *  - When no category is selected → a mixed, shuffled spread across restaurants.
 *  - When a category is selected → only meals from that category's restaurants,
 *    surfacing featured ones first.
 *
 * `restaurants` is the already-scoped list (all, or filtered by category) and
 * `shuffle` toggles the random mix for the "All" view.
 */
export const usePopularMeals = (restaurants: Restaurant[], shuffle: boolean) => {
  const { getRestaurantMeals } = useRestaurantsRepository();

  // Cap the number of source restaurants to keep the fan-out cheap.
  const sources = useMemo(
    () => restaurants.slice(0, SOURCE_RESTAURANT_LIMIT),
    [restaurants],
  );

  const results = useQueries({
    queries: sources.map((restaurant) => ({
      queryKey: [POPULAR_MEALS_QUERY_KEY, restaurant.id],
      queryFn: () => getRestaurantMeals(restaurant.id),
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
    })),
  });

  const isLoading = results.length > 0 && results.some((r) => r.isLoading);

  // Stable signature of which restaurant queries have resolved — drives memo.
  const resolvedKey = sources
    .map((restaurant, index) => (results[index]?.data ? restaurant.id : ""))
    .join("|");

  const meals = useMemo<PopularMeal[]>(() => {
    // Take a capped, interleaved slice from each restaurant so the rail feels
    // varied rather than "all of restaurant A, then all of restaurant B".
    const perRestaurant: PopularMeal[][] = sources.map((restaurant, index) => {
      const data = results[index]?.data ?? [];
      const ranked = [...data].sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
      );
      const picked = shuffle
        ? seededShuffle(ranked, restaurant.id).slice(0, MAX_PER_RESTAURANT)
        : ranked.slice(0, MAX_PER_RESTAURANT);
      return picked.map((meal) => ({ meal, restaurant }));
    });

    // Round-robin interleave across restaurants.
    const interleaved: PopularMeal[] = [];
    const maxLen = Math.max(0, ...perRestaurant.map((list) => list.length));
    for (let col = 0; col < maxLen; col += 1) {
      for (const list of perRestaurant) {
        if (list[col]) interleaved.push(list[col]);
      }
    }

    return shuffle ? seededShuffle(interleaved, resolvedKey) : interleaved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedKey, shuffle, sources]);

  return { meals, isLoading };
};
