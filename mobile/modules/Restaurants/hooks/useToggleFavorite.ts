import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Restaurant } from "../entities/Restaurant";

/**
 * Toggle a restaurant's favourite state. Local-first, so the update is
 * synchronous and instant — no optimistic/rollback dance needed and nothing
 * can fail with a 404. Persistence to SecureStore happens transparently.
 *
 * We accept the full `Restaurant` so the favourites list can render straight
 * from the store with no extra fetch. A light haptic confirms the action.
 */
export const useToggleFavorite = () => {
  const toggle = useFavoritesStore((s) => s.toggle);

  const mutate = useCallback(
    (restaurant: Restaurant) => {
      const nowFavorited = toggle(restaurant);
      Haptics.impactAsync(
        nowFavorited
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);
      return nowFavorited;
    },
    [toggle],
  );

  // `isPending` kept for API compatibility; local writes are never pending.
  return { mutate, isPending: false };
};
