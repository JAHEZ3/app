import { useEffect, useMemo, useState } from "react";
import { useRestaurants } from "./useRestaurants";
import { Restaurant } from "../entities/Restaurant";
import { isNewRestaurant } from "../utils/mockHomeContent";

/**
 * Filter chips backed by REAL list data only. Delivery-time / free-delivery /
 * offers chips are intentionally omitted — the list endpoint exposes no such
 * fields, so we don't ship filters that can't actually filter.
 */
export type FilterKey =
  | "all"
  | "openNow"
  | "topRated"
  | "popular"
  | "new";

export type SortKey =
  | "recommended"
  | "rating"
  | "popular"
  | "newest"
  | "minOrder";

const TOP_RATED_MIN = 4.5;

/**
 * Discovery layer over `useRestaurants`. Search is sent to the API (debounced);
 * filter chips and sort are applied client-side over the already-loaded pages.
 * All pagination / refetch / error state from the underlying query is preserved
 * and re-exported untouched.
 */
export const useRestaurantsDiscovery = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recommended");

  // Debounce the server-side search so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => clearTimeout(id);
  }, [search]);

  const query = useRestaurants({
    search: debouncedSearch || undefined,
  });

  const { restaurants } = query;

  // ── Client-side filter ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    switch (filter) {
      case "openNow":
        return restaurants.filter((r) => r.isOpen);
      case "topRated":
        return restaurants.filter((r) => r.rating >= TOP_RATED_MIN);
      case "popular":
        return restaurants.filter((r) => r.totalRatings >= 10);
      case "new":
        return restaurants.filter((r) => isNewRestaurant(r.id));
      case "all":
      default:
        return restaurants;
    }
  }, [restaurants, filter]);

  // ── Client-side sort ────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "rating":
        return list.sort((a, b) => b.rating - a.rating || b.totalRatings - a.totalRatings);
      case "popular":
        return list.sort((a, b) => b.totalRatings - a.totalRatings);
      case "newest":
        // Heuristic newest-first: "new" flag wins, then by review count asc.
        return list.sort(
          (a, b) =>
            Number(isNewRestaurant(b.id)) - Number(isNewRestaurant(a.id)) ||
            a.totalRatings - b.totalRatings,
        );
      case "minOrder":
        return list.sort((a, b) => a.minOrderAmount - b.minOrderAmount);
      case "recommended":
      default:
        // Open first, then by a blended rating × popularity score.
        return list.sort((a, b) => {
          if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
          return b.rating * Math.log10(b.totalRatings + 1) -
            a.rating * Math.log10(a.totalRatings + 1);
        });
    }
  }, [filtered, sort]);

  // Per-chip counts so the UI can show live badges without extra passes.
  const counts = useMemo(
    () => ({
      all: restaurants.length,
      openNow: restaurants.filter((r) => r.isOpen).length,
      topRated: restaurants.filter((r) => r.rating >= TOP_RATED_MIN).length,
      popular: restaurants.filter((r) => r.totalRatings >= 10).length,
      new: restaurants.filter((r) => isNewRestaurant(r.id)).length,
    }),
    [restaurants],
  );

  const isFilteringOrSearching = filter !== "all" || debouncedSearch.length > 0;

  return {
    ...query,
    // The display list (filtered + sorted). `query.restaurants` stays raw.
    results: sorted,
    rawCount: restaurants.length,
    counts,
    // Controls
    search,
    setSearch,
    debouncedSearch,
    filter,
    setFilter,
    sort,
    setSort,
    isFilteringOrSearching,
  };
};
