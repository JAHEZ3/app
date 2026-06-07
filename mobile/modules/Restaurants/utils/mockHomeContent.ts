/**
 * Safe, isolated mock content for Home sections that have NO backing API yet.
 *
 * Everything fake-but-presentational lives here so it's trivial to delete once
 * real endpoints exist. Nothing here implies a broken feature — promos link to
 * the restaurants list, and the "new" badge is a harmless visual flourish.
 *
 * When the backend ships:
 *   - Promos  → replace `PROMO_BANNERS` with a `useOffers()` query.
 *   - New     → replace `isNewRestaurant` with a real `createdAt`/`isNew` field.
 */

export interface PromoBanner {
  id: string;
  /** i18n keys so copy stays localized. */
  titleKey: string;
  subtitleKey: string;
  badgeKey: string;
  /** Gradient stops (start → end). */
  gradient: [string, string];
  icon: string; // Ionicons glyph name
}

export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "promo-free-delivery",
    titleKey: "promo.freeDelivery.title",
    subtitleKey: "promo.freeDelivery.subtitle",
    badgeKey: "promo.freeDelivery.badge",
    gradient: ["#F55905", "#FF8A3D"],
    icon: "bicycle",
  },
  {
    id: "promo-first-order",
    titleKey: "promo.firstOrder.title",
    subtitleKey: "promo.firstOrder.subtitle",
    badgeKey: "promo.firstOrder.badge",
    gradient: ["#6D28D9", "#A855F7"],
    icon: "gift",
  },
  {
    id: "promo-weekend",
    titleKey: "promo.weekend.title",
    subtitleKey: "promo.weekend.subtitle",
    badgeKey: "promo.weekend.badge",
    gradient: ["#0F766E", "#14B8A6"],
    icon: "flame",
  },
];

/**
 * Deterministic "is this restaurant new?" heuristic until the API exposes a real
 * signal. Uses a stable hash of the id so the badge doesn't flicker between
 * renders, and flags a small, consistent subset (~1 in 4).
 */
export const isNewRestaurant = (id: string): boolean => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 4 === 0;
};
