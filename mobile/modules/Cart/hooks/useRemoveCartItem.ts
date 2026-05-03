import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useCartRepository } from '..';
import type { Cart } from '../types';
import { CART_QUERY_KEY } from './useAddToCart';

interface MutationContext {
    previous: Cart | null | undefined;
}

const removeCartItem = (cart: Cart, mealId: string): Cart | null => {
    const items = cart.items.filter((item) => item.mealId !== mealId);
    if (items.length === 0) return null;

    return {
        ...cart,
        items,
        subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0),
    };
};

export const useRemoveCartItem = () => {
    const { removeItem } = useCartRepository();
    const queryClient = useQueryClient();

    return useMutation<Cart | null | undefined, AxiosError, string, MutationContext>({
        mutationFn: (mealId) => removeItem(mealId),
        retry: 0,

        onMutate: async (mealId) => {
            await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
            const previous = queryClient.getQueryData<Cart | null>(CART_QUERY_KEY);
            if (previous) {
                queryClient.setQueryData<Cart | null>(
                    CART_QUERY_KEY,
                    removeCartItem(previous, mealId),
                );
            }
            return { previous };
        },

        onError: (_err, _mealId, context) => {
            if (context) {
                queryClient.setQueryData(CART_QUERY_KEY, context.previous);
            }
        },

        onSuccess: (cart) => {
            if (cart !== undefined) {
                queryClient.setQueryData(CART_QUERY_KEY, cart);
            }
        },
    });
};
