import { create } from "zustand";
import type { MealSelectionResult, SelectionsByGroup } from "@/modules/Restaurants/hooks/useMealOptionsSelection";

export interface CartItem {
  id: string;
  mealId: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selections: SelectionsByGroup;
  selectedOptions: { groupId: string; optionId: string; name: string; extraPrice: number }[];
}

interface CartState {
  items: CartItem[];
  addItem: (result: MealSelectionResult) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const buildKey = (result: MealSelectionResult) => {
  const optionIds = result.selectedOptions
    .map(({ groupId, option }) => `${groupId}:${option.id}`)
    .sort()
    .join("|");
  return `${result.meal.id}:${optionIds}`;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (result) =>
    set((state) => {
      const id = buildKey(result);
      const existing = state.items.find((item) => item.id === id);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: item.quantity + result.quantity,
                  totalPrice: item.totalPrice + result.totalPrice,
                }
              : item,
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            id,
            mealId: result.meal.id,
            name: result.meal.name,
            imageUrl: result.meal.imageUrl,
            quantity: result.quantity,
            unitPrice: result.unitPrice,
            totalPrice: result.totalPrice,
            selections: result.selections,
            selectedOptions: result.selectedOptions.map(({ groupId, option }) => ({
              groupId,
              optionId: option.id,
              name: option.name,
              extraPrice: option.extraPrice,
            })),
          },
        ],
      };
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clearCart: () => set({ items: [] }),
}));

export const getCartQuantity = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const getCartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.totalPrice, 0);
