"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { restaurantApi } from "@/lib/api";
import { queryKeys, queryClient } from "@/lib/queryClient";
import { Restaurant, DashboardStats, SalesDataPoint, RestaurantHour } from "@/types/restaurant.types";
import { TopSellingMeal } from "@/types/menu.types";
import { UpdateRestaurantDto, UpdateStoreStatusDto, UpdateRestaurantHourDto } from "@/dto/restaurant.dto";

export function useRestaurant() {
  return useQuery<Restaurant>({
    queryKey: queryKeys.restaurant.me,
    queryFn: async () => {
      const res = await restaurantApi.getMe();
      return res.data;
    },
  });
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.restaurant.stats,
    queryFn: async () => {
      const res = await restaurantApi.getDashboardStats();
      return res.data;
    },
    refetchInterval: 60 * 1000, // refetch every minute
  });
}

export function useSalesData(period: "daily" | "weekly" | "monthly" = "daily") {
  return useQuery<SalesDataPoint[]>({
    queryKey: queryKeys.restaurant.sales(period),
    queryFn: async () => {
      const res = await restaurantApi.getSalesData(period);
      return res.data;
    },
  });
}

export function useTopMeals() {
  return useQuery<TopSellingMeal[]>({
    queryKey: queryKeys.restaurant.topMeals,
    queryFn: async () => {
      const res = await restaurantApi.getTopMeals();
      return res.data;
    },
  });
}

export function useRestaurantHours() {
  return useQuery<RestaurantHour[]>({
    queryKey: queryKeys.restaurant.hours,
    queryFn: async () => {
      const res = await restaurantApi.getHours();
      return res.data;
    },
  });
}

export function useUpdateRestaurant() {
  return useMutation({
    mutationFn: (data: UpdateRestaurantDto) => restaurantApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurant.me });
    },
  });
}

export function useToggleStoreStatus() {
  return useMutation({
    mutationFn: (data: UpdateStoreStatusDto) => restaurantApi.toggleOpen(data.isOpen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurant.me });
    },
  });
}

export function useUpdateHour() {
  return useMutation({
    mutationFn: (data: UpdateRestaurantHourDto) => restaurantApi.updateHour(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurant.hours });
    },
  });
}
