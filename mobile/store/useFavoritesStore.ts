import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Restaurant } from "@/modules/Restaurants/entities/Restaurant";

/**
 * Local-first favourites.
 *
 * Favourites live entirely on-device. We persist the *full* restaurant object
 * (not just its id) so the Favourites screen can render instantly with zero
 * network round-trips and works fully offline. This store is the single source
 * of truth — every screen (cards, details, favourites list) reads from it, so
 * adds/removes stay in sync everywhere automatically.
 *
 * Items are keyed by id in a record, which makes `isFavorite` an O(1) lookup
 * and makes duplicates impossible by construction.
 */

const secureStorage = createJSONStorage(() => ({
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}));

interface FavoritesState {
  /** id -> restaurant snapshot, in insertion order isn't guaranteed; see `addedAt`. */
  byId: Record<string, Restaurant>;
  /** id -> epoch ms when it was favourited, used to sort newest-first. */
  addedAt: Record<string, number>;
  /** Becomes true once the persisted state has been rehydrated from storage. */
  hydrated: boolean;

  add: (restaurant: Restaurant) => void;
  remove: (id: string) => void;
  toggle: (restaurant: Restaurant) => boolean;
  clear: () => void;
  _setHydrated: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byId: {},
      addedAt: {},
      hydrated: false,

      add: (restaurant) =>
        set((state) => {
          if (state.byId[restaurant.id]) return state; // no-op + no duplicate
          return {
            byId: { ...state.byId, [restaurant.id]: restaurant },
            addedAt: { ...state.addedAt, [restaurant.id]: Date.now() },
          };
        }),

      remove: (id) =>
        set((state) => {
          if (!state.byId[id]) return state;
          const byId = { ...state.byId };
          const addedAt = { ...state.addedAt };
          delete byId[id];
          delete addedAt[id];
          return { byId, addedAt };
        }),

      /** Flips membership. Returns the new favourited state. */
      toggle: (restaurant) => {
        const isFav = !!get().byId[restaurant.id];
        if (isFav) get().remove(restaurant.id);
        else get().add(restaurant);
        return !isFav;
      },

      clear: () => set({ byId: {}, addedAt: {} }),

      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "favorites-v1",
      storage: secureStorage,
      partialize: (state) => ({ byId: state.byId, addedAt: state.addedAt }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);

/**
 * Stable, referentially-cheap selector for "is this id a favourite?".
 * Subscribing to a single boolean means a card only re-renders when *its own*
 * favourite state flips — not when any other favourite changes.
 */
export const useIsFavorite = (id: string | undefined): boolean =>
  useFavoritesStore((s) => (id ? !!s.byId[id] : false));
