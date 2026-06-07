import { useMemo } from "react";
import { Restaurant } from "../entities/Restaurant";
import { isNewRestaurant } from "../utils/mockHomeContent";

export interface HomeSections {
  trending: Restaurant[];
  topRated: Restaurant[];
  newOnApp: Restaurant[];
  suggested: Restaurant[];
}

const RAIL_SIZE = 8;

/**
 * Derives the home rails (Trending, Top Rated, New, Suggested) from the
 * restaurant list ALREADY loaded by the feed — no extra network calls. Pure,
 * memoized transforms, so these only recompute when inputs change.
 *
 * - Trending  : most-reviewed (totalRatings), a stand-in for "most ordered"
 *               until the backend exposes order volume.
 * - Top Rated : highest rating, with a minimum review count so a lone 5★ doesn't
 *               outrank a well-reviewed 4.8★.
 * - New       : flagged by the (mock) `isNewRestaurant` heuristic.
 * - Suggested : restaurants whose cuisine matches the user's favorites; falls
 *               back to highly-rated open spots when there are no favorites.
 */
export const useHomeSections = (
  restaurants: Restaurant[],
  favoriteRestaurants: Restaurant[],
): HomeSections => {
  return useMemo(() => {
    const trending = [...restaurants]
      .sort((a, b) => b.totalRatings - a.totalRatings)
      .slice(0, RAIL_SIZE);

    const topRated = [...restaurants]
      .filter((r) => r.totalRatings >= 3)
      .sort((a, b) => b.rating - a.rating || b.totalRatings - a.totalRatings)
      .slice(0, RAIL_SIZE);

    const newOnApp = restaurants
      .filter((r) => isNewRestaurant(r.id))
      .slice(0, RAIL_SIZE);

    const favoriteCuisines = new Set(
      favoriteRestaurants
        .map((r) => r.cuisineType?.toLowerCase())
        .filter((c): c is string => !!c),
    );

    const suggestedPool = favoriteCuisines.size
      ? restaurants.filter(
          (r) =>
            r.cuisineType &&
            favoriteCuisines.has(r.cuisineType.toLowerCase()) &&
            !favoriteRestaurants.some((f) => f.id === r.id),
        )
      : restaurants.filter((r) => r.isOpen);

    const suggested = [...suggestedPool]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, RAIL_SIZE);

    return { trending, topRated, newOnApp, suggested };
  }, [restaurants, favoriteRestaurants]);
};
