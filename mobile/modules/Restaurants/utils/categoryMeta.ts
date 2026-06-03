import { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface CategoryMeta {
  /** Canonical cuisine key as stored on the restaurant (`cuisineType`). */
  key: string;
  icon: IoniconName;
  /** Emoji used inside the icon bubble — friendlier than a glyph for food. */
  emoji: string;
  /** Two-stop gradient for the icon bubble. */
  gradient: [string, string];
  labelAr: string;
  labelEn: string;
}

/**
 * Canonical catalogue of cuisine categories. Mirrors the server-side
 * `CuisineType` enum (restaurant-service `restaurant.entity.ts`). Keep this in
 * sync if a new cuisine is added on the backend.
 */
export const CATEGORY_META: CategoryMeta[] = [
  { key: "fast_food", emoji: "🍔", icon: "fast-food", gradient: ["#FF8A3D", "#F55905"], labelAr: "وجبات سريعة", labelEn: "Fast Food" },
  { key: "pizza", emoji: "🍕", icon: "pizza", gradient: ["#FF7A59", "#E23744"], labelAr: "بيتزا", labelEn: "Pizza" },
  { key: "shawarma", emoji: "🌯", icon: "fast-food", gradient: ["#F6A23B", "#D9822B"], labelAr: "شاورما", labelEn: "Shawarma" },
  { key: "grills", emoji: "🍖", icon: "flame", gradient: ["#F76B4E", "#C2410C"], labelAr: "مشاوي", labelEn: "Grills" },
  { key: "sandwiches", emoji: "🥪", icon: "fast-food", gradient: ["#FBBF5E", "#E59A1E"], labelAr: "سندويتشات", labelEn: "Sandwiches" },
  { key: "kitchen", emoji: "🍲", icon: "restaurant", gradient: ["#F59E5B", "#D97706"], labelAr: "مطبخ", labelEn: "Kitchen" },
  { key: "breakfast", emoji: "🍳", icon: "egg", gradient: ["#FDBA3B", "#F59E0B"], labelAr: "فطور", labelEn: "Breakfast" },
  { key: "seafood", emoji: "🦐", icon: "fish", gradient: ["#38BDF8", "#0EA5E9"], labelAr: "مأكولات بحرية", labelEn: "Seafood" },
  { key: "asian", emoji: "🍜", icon: "restaurant", gradient: ["#FB7185", "#E11D48"], labelAr: "آسيوي", labelEn: "Asian" },
  { key: "healthy", emoji: "🥗", icon: "leaf", gradient: ["#4ADE80", "#16A34A"], labelAr: "صحي", labelEn: "Healthy" },
  { key: "sweets", emoji: "🍰", icon: "ice-cream", gradient: ["#F9A8D4", "#EC4899"], labelAr: "حلويات", labelEn: "Sweets" },
  { key: "drinks", emoji: "🥤", icon: "cafe", gradient: ["#A78BFA", "#7C3AED"], labelAr: "مشروبات", labelEn: "Drinks" },
  { key: "other", emoji: "🍽️", icon: "restaurant", gradient: ["#94A3B8", "#64748B"], labelAr: "أخرى", labelEn: "Other" },
];

const CATEGORY_BY_KEY = new Map(CATEGORY_META.map((meta) => [meta.key, meta]));

const FALLBACK: CategoryMeta = CATEGORY_META[CATEGORY_META.length - 1];

/** Meta used for the synthetic "All" chip that sits first in the rail. */
export const ALL_CATEGORY_META = {
  emoji: "✨",
  icon: "grid" as IoniconName,
  gradient: ["#F55905", "#C2410C"] as [string, string],
  labelAr: "الكل",
  labelEn: "All",
};

export const getCategoryMeta = (cuisineType?: string | null): CategoryMeta => {
  if (!cuisineType) return FALLBACK;
  return CATEGORY_BY_KEY.get(cuisineType.toLowerCase()) ?? FALLBACK;
};

export const getCategoryLabel = (cuisineType: string | null | undefined, isArabic: boolean): string => {
  const meta = getCategoryMeta(cuisineType);
  return isArabic ? meta.labelAr : meta.labelEn;
};

/**
 * Normalises a free-form category name (from the `/categories` endpoint) into
 * the canonical `cuisineType` key used to filter restaurants — e.g.
 * "Fast Food" / "fast-food" → "fast_food". The restaurant listing filters on
 * the `cuisine_type` enum, so the category name is the bridge between the
 * curated category catalogue and the restaurants it represents.
 */
export const normalizeCuisineKey = (name: string): string =>
  name.trim().toLowerCase().replace(/[\s-]+/g, '_');
