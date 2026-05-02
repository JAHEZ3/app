import type { ImageSource } from "expo-image";

const FOOD_IMAGE_BASE =
  "https://images.unsplash.com";

export const FOOD_PLACEHOLDER_IMAGES = {
  breakfast: `${FOOD_IMAGE_BASE}/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=700&q=80`,
  fast_food: `${FOOD_IMAGE_BASE}/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80`,
  shawarma: `${FOOD_IMAGE_BASE}/photo-1633321702518-7feccafb94d5?auto=format&fit=crop&w=700&q=80`,
  sandwiches: `${FOOD_IMAGE_BASE}/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=700&q=80`,
  sweets: `${FOOD_IMAGE_BASE}/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=700&q=80`,
  drinks: `${FOOD_IMAGE_BASE}/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=80`,
  pizza: `${FOOD_IMAGE_BASE}/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80`,
  healthy: `${FOOD_IMAGE_BASE}/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80`,
  asian: `${FOOD_IMAGE_BASE}/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=700&q=80`,
  seafood: `${FOOD_IMAGE_BASE}/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=700&q=80`,
  grills: `${FOOD_IMAGE_BASE}/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=700&q=80`,
  kitchen: `${FOOD_IMAGE_BASE}/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=700&q=80`,
  other: `${FOOD_IMAGE_BASE}/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=80`,
} as const;

export type FoodCategoryKey = keyof typeof FOOD_PLACEHOLDER_IMAGES;

export const formatCuisineType = (value?: string | null) => {
  if (!value) return "Popular";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getFoodPlaceholderUrl = (key?: string | null) => {
  const normalized = (key ?? "other").toLowerCase() as FoodCategoryKey;
  return FOOD_PLACEHOLDER_IMAGES[normalized] ?? FOOD_PLACEHOLDER_IMAGES.other;
};

export const imageSource = (
  url?: string | null,
  fallbackKey?: string | null,
): ImageSource => ({
  uri: url || getFoodPlaceholderUrl(fallbackKey),
});

export const getMealImageSource = (
  imageUrl?: string | null,
  tags?: string[] | null,
  fallbackKey?: string | null,
) => imageSource(imageUrl, tags?.[0] ?? fallbackKey);
