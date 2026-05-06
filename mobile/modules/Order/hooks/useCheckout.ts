import { useMutation, useQueryClient, type MutateOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useOrderRepository } from '..';
import { CART_QUERY_KEY } from '@/modules/Cart/hooks/useAddToCart';
import type { CheckoutOrder } from '../types';
import { generateUuidV4 } from '../utils/uuid';

export const ORDER_CHECKOUT_KEY = ['order', 'checkout'] as const;

interface CheckoutVariables {
    idempotencyKey: string;
}

type StartCheckoutOptions = MutateOptions<CheckoutOrder, AxiosError, CheckoutVariables>;

export const isCheckoutConflict = (err: unknown): err is AxiosError =>
    err instanceof AxiosError && err.response?.status === 409;

export const useCheckout = () => {
    const { checkout } = useOrderRepository();
    const queryClient = useQueryClient();

    const mutation = useMutation<CheckoutOrder, AxiosError, CheckoutVariables>({
        mutationFn: ({ idempotencyKey }) => checkout(idempotencyKey),
        retry: 0,
        onSuccess: () => {
            queryClient.setQueryData(CART_QUERY_KEY, null);
            queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        },
    });

    return {
        ...mutation,
        startCheckout: (_unused?: undefined, options?: StartCheckoutOptions) =>
            mutation.mutate({ idempotencyKey: generateUuidV4() }, options),
        startCheckoutAsync: () =>
            mutation.mutateAsync({ idempotencyKey: generateUuidV4() }),
    };
};
