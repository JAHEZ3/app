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

export const useRateOrder = () => {
    const { rateOrder } = useOrderRepository();
    const queryClient = useQueryClient();

    return useMutation<void, AxiosError, Variables>({
        mutationFn: ({ orderId, rating, comment }) =>
            rateOrder(orderId, { rating, comment }),
        retry: 0,
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};
