import { useCallback } from "react";
import { useFavoritesStore, useIsFavorite } from "@/store/useFavoritesStore";

/**
 * Favourites are stored locally (single source of truth: useFavoritesStore).
 * This hook keeps the original public surface so existing call sites keep
 * working, but now reads/writes the store instead of a dead REST endpoint.
 */
export const useFavorites = () => {
  const byId = useFavoritesStore((s) => s.byId);
  const hydrated = useFavoritesStore((s) => s.hydrated);

  const isFavorite = useCallback(
    (restaurantId: string): boolean => !!byId[restaurantId],
    [byId],
  );

  return { isFavorite, isLoading: !hydrated };
};

/** Subscribe to a single restaurant's favourite flag (minimal re-renders). */
export { useIsFavorite };
