import { useEffect, useMemo, useState } from "react";
import { useRestaurants } from "./useRestaurants";
import { useRestaurantMenus } from "./useRestaurantMenus";
import { useMenuSections } from "./useMenuSections";
import { Meal } from "../entities/Meal";
import { Restaurant } from "../entities/Restaurant";

const HOME_RESTAURANT_LIMIT = 50;

export interface HomeCategory {
  cuisineType: string | null;
  count: number;
  imageUrl?: string;
}

export interface HomeFeaturedMeal {
  type: "meal";
  id: string;
  meal: Meal;
  restaurant: Restaurant;
}

export interface HomeFeaturedRestaurant {
  type: "restaurant";
  id: string;
  restaurant: Restaurant;
}

export type HomeFeaturedItem = HomeFeaturedMeal | HomeFeaturedRestaurant;

export const useRestaurantHomeFeed = () => {
  const restaurantsQuery = useRestaurants({ limit: HOME_RESTAURANT_LIMIT });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedCuisineType, setSelectedCuisineType] = useState<string | null>(null);

  const restaurants = restaurantsQuery.restaurants;

  const categories = useMemo(() => {
    const map = new Map<string, HomeCategory>();

    for (const restaurant of restaurants) {
      if (!restaurant.cuisineType) continue;
      const existing = map.get(restaurant.cuisineType);
      map.set(restaurant.cuisineType, {
        cuisineType: restaurant.cuisineType,
        count: (existing?.count ?? 0) + 1,
        imageUrl: existing?.imageUrl || restaurant.coverUrl || restaurant.logoUrl,
      });
    }

    if (!restaurants.length && restaurantsQuery.isLoading) return [];

    const firstRestaurant = restaurants[0];

    return [
      {
        cuisineType: null,
        count: restaurants.length,
        imageUrl: firstRestaurant ? firstRestaurant.coverUrl || firstRestaurant.logoUrl : undefined,
      },
      ...Array.from(map.values()),
    ];
  }, [restaurants, restaurantsQuery.isLoading]);

  useEffect(() => {
    if (selectedCuisineType === null) return;

    if (!categories.length) {
      setSelectedCuisineType(null);
      return;
    }

    const stillExists = categories.some((category) => category.cuisineType === selectedCuisineType);
    if (!stillExists) {
      setSelectedCuisineType(null);
    }
  }, [categories, selectedCuisineType]);

  const filteredRestaurants = useMemo(
    () =>
      selectedCuisineType
        ? restaurants.filter((restaurant) => restaurant.cuisineType === selectedCuisineType)
        : restaurants,
    [restaurants, selectedCuisineType],
  );

  useEffect(() => {
    if (!filteredRestaurants.length) {
      setSelectedRestaurantId(null);
      return;
    }

    const stillExists = filteredRestaurants.some((restaurant) => restaurant.id === selectedRestaurantId);
    if (!stillExists) {
      setSelectedRestaurantId(filteredRestaurants[0].id);
    }
  }, [filteredRestaurants, selectedRestaurantId]);

  const selectedRestaurant = useMemo(
    () =>
      filteredRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
      filteredRestaurants[0],
    [filteredRestaurants, selectedRestaurantId],
  );

  const menusQuery = useRestaurantMenus(selectedRestaurant?.id);
  const sectionsQuery = useMenuSections(
    selectedRestaurant?.id,
    menusQuery.selectedMenuId ?? undefined,
  );

  const meals = useMemo(() => {
    const allMeals = (sectionsQuery.data ?? []).flatMap((section) => section.meals);
    return [...allMeals].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }, [sectionsQuery.data]);

  const featuredItems = useMemo<HomeFeaturedItem[]>(() => {
    if (selectedRestaurant && meals.length) {
      return meals.slice(0, 5).map((meal) => ({
        type: "meal",
        id: meal.id,
        meal,
        restaurant: selectedRestaurant,
      }));
    }

    return restaurants.slice(0, 5).map((restaurant) => ({
      type: "restaurant",
      id: restaurant.id,
      restaurant,
    }));
  }, [meals, restaurants, selectedRestaurant]);

  return {
    restaurants,
    filteredRestaurants,
    categories,
    totalRestaurants: restaurantsQuery.total,
    featuredItems,
    meals,
    selectedRestaurant,
    selectedRestaurantId,
    setSelectedRestaurantId,
    selectedCuisineType,
    setSelectedCuisineType,
    menus: menusQuery.menus,
    selectedMenuId: menusQuery.selectedMenuId,
    selectMenu: menusQuery.selectMenu,
    isLoading:
      restaurantsQuery.isLoading ||
      menusQuery.isLoading ||
      sectionsQuery.isLoading,
    isRefreshing:
      restaurantsQuery.isRefetching ||
      menusQuery.isLoading ||
      sectionsQuery.isRefetching,
    isError:
      restaurantsQuery.isError ||
      menusQuery.isError ||
      sectionsQuery.isError,
    refetch: () => {
      restaurantsQuery.refetch();
      menusQuery.refetch();
      sectionsQuery.refetch();
    },
  };
};
