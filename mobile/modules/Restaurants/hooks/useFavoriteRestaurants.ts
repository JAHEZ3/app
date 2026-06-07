import { useMemo } from "react";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Restaurant } from "../entities/Restaurant";

/**
 * The list of favourited restaurants, newest-first, read straight from the
 * local store. No network, no skeleton-forever bug — the data is already there.
 * `isLoading` only reflects the brief storage rehydration on cold start.
 */
export const useFavoriteRestaurants = () => {
  const byId = useFavoritesStore((s) => s.byId);
  const addedAt = useFavoritesStore((s) => s.addedAt);
  const hydrated = useFavoritesStore((s) => s.hydrated);

  const data = useMemo<Restaurant[]>(
    () =>
      Object.values(byId).sort(
        (a, b) => (addedAt[b.id] ?? 0) - (addedAt[a.id] ?? 0),
      ),
    [byId, addedAt],
  );

  return { data, isLoading: !hydrated };
};
