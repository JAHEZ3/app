import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useOrderRepository } from '..';
import type { RateOrderPayload } from '../repository/OrderRepository';
import { ORDER_DETAILS_QUERY_KEY } from './useOrderDetails';

interface Variables extends RateOrderPayload {
    orderId: string;
}

interface ApiErrorPayload {
    message?: string | string[];
}

export const getRateErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

/** True when the server says this order was already rated (HTTP 409). */
export const isAlreadyRatedError = (err: unknown): boolean =>
    err instanceof AxiosError && err.response?.status === 409;

export const useRateOrder = () => {
    const { rateOrder } = useOrderRepository();
    const queryClient = useQueryClient();

    return useMutation<void, AxiosError, Variables>({
        mutationFn: ({ orderId, foodRating, deliveryRating, comment }) =>
            rateOrder(orderId, { foodRating, deliveryRating, comment }),
        retry: 0,
        onSuccess: (_data, { orderId }) => {
            // Refresh the order (so the rating gate flips) and any list views.
            queryClient.invalidateQueries({ queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};
