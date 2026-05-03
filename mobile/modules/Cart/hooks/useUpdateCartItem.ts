import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useCartRepository } from '..';
import type { Cart, UpdateCartItemInput } from '../types';
import { CART_QUERY_KEY } from './useAddToCart';

interface UpdateVars {
    mealId: string;
    input: UpdateCartItemInput;
}

interface MutationContext {
    previous: Cart | null | undefined;
}

const projectCart = (cart: Cart, mealId: string, quantity: number): Cart | null => {
    if (quantity === 0) {
        const remaining = cart.items.filter((item) => item.mealId !== mealId);
        if (remaining.length === 0) return null;
        return {
            ...cart,
            items: remaining,
            subtotal: remaining.reduce((sum, item) => sum + item.totalPrice, 0),
        };
    }

    const items = cart.items.map((item) =>
        item.mealId === mealId
            ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
            : item,
    );
    return {
        ...cart,
        items,
        subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0),
    };
};

export const useUpdateCartItem = () => {
    const { updateItem } = useCartRepository();
    const queryClient = useQueryClient();

    return useMutation<Cart | null, AxiosError, UpdateVars, MutationContext>({
        mutationFn: ({ mealId, input }) => updateItem(mealId, input),
        retry: 0,

        onMutate: async ({ mealId, input }) => {
            await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
            const previous = queryClient.getQueryData<Cart | null>(CART_QUERY_KEY);
            if (previous) {
                queryClient.setQueryData<Cart | null>(
                    CART_QUERY_KEY,
                    projectCart(previous, mealId, input.quantity),
                );
            }
            return { previous };
        },

        onError: (_err, _vars, context) => {
            if (context) {
                queryClient.setQueryData(CART_QUERY_KEY, context.previous);
            }
        },

        onSuccess: (cart) => {
            queryClient.setQueryData(CART_QUERY_KEY, cart);
        },
    });
};
