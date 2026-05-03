import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useCartRepository } from '..';
import type { Cart } from '../types';
import { CART_QUERY_KEY } from './useAddToCart';

interface MutationContext {
    previous: Cart | null | undefined;
}

export const useClearCart = () => {
    const { clearCart } = useCartRepository();
    const queryClient = useQueryClient();

    return useMutation<Cart | null | undefined, AxiosError, void, MutationContext>({
        mutationFn: clearCart,
        retry: 0,

        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
            const previous = queryClient.getQueryData<Cart | null>(CART_QUERY_KEY);
            queryClient.setQueryData<Cart | null>(CART_QUERY_KEY, null);
            return { previous };
        },

        onError: (_err, _vars, context) => {
            if (context) {
                queryClient.setQueryData(CART_QUERY_KEY, context.previous);
            }
        },

        onSuccess: () => {
            queryClient.setQueryData<Cart | null>(CART_QUERY_KEY, null);
        },
    });
};
