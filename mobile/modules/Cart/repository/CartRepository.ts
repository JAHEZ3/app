import type { AddToCartInput, Cart, UpdateCartItemInput } from '../types';

export interface CartRepository {
    getCart: () => Promise<Cart | null>;
    addItem: (input: AddToCartInput) => Promise<Cart>;
    updateItem: (mealId: string, input: UpdateCartItemInput) => Promise<Cart | null>;
    removeItem: (mealId: string) => Promise<Cart | null | undefined>;
    clearCart: () => Promise<Cart | null | undefined>;
}
