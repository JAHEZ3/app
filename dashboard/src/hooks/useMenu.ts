"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { menuApi, mealsApi } from "@/lib/api";
import { queryKeys, queryClient } from "@/lib/queryClient";
import { Menu } from "@/types/menu.types";
import { CreateMealDto, UpdateMealDto, CreateMenuDto, CreateMenuSectionDto } from "@/dto/meal.dto";

export function useMenu() {
  return useQuery<Menu[]>({
    queryKey: queryKeys.menu.all,
    queryFn: async () => {
      const res = await menuApi.getAll();
      return res.data;
    },
  });
}

// ── Menu CRUD ────────────────────────────────────────────
export function useCreateMenu() {
  return useMutation({
    mutationFn: (data: CreateMenuDto) => menuApi.createMenu(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useUpdateMenu() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMenuDto> }) =>
      menuApi.updateMenu(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useDeleteMenu() {
  return useMutation({
    mutationFn: (id: string) => menuApi.deleteMenu(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

// ── Section CRUD ─────────────────────────────────────────
export function useCreateSection() {
  return useMutation({
    mutationFn: (data: CreateMenuSectionDto) => menuApi.createSection(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useUpdateSection() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMenuSectionDto> }) =>
      menuApi.updateSection(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useDeleteSection() {
  return useMutation({
    mutationFn: (id: string) => menuApi.deleteSection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

// ── Meal CRUD ─────────────────────────────────────────────
export function useCreateMeal() {
  return useMutation({
    mutationFn: (data: CreateMealDto) => mealsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useUpdateMeal() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMealDto }) =>
      mealsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useDeleteMeal() {
  return useMutation({
    mutationFn: (id: string) => mealsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}

export function useToggleMealAvailability() {
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      mealsApi.toggleAvailability(id, isAvailable),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all }),
  });
}
