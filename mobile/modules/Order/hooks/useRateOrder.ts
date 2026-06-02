<<<<<<< HEAD
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useOrderRepository } from '..';
import { ORDER_DETAILS_QUERY_KEY } from './useOrderDetails';
import type { OrderDetails, OrderRating, RateOrderPayload } from '../types';
=======
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useOrderRepository } from '..';
import type { RateOrderPayload } from '../repository/OrderRepository';
import { ORDER_DETAILS_QUERY_KEY } from './useOrderDetails';

interface Variables extends RateOrderPayload {
    orderId: string;
}
>>>>>>> origin/Dashbords

interface ApiErrorPayload {
    message?: string | string[];
}

<<<<<<< HEAD
export type RateErrorReason =
    | 'already_rated'
    | 'not_delivered'
    | 'forbidden'
    | 'unauthorized'
    | 'network'
    | 'invalid'
    | 'error';

export interface RateOrderResult {
    ok: boolean;
    rating?: OrderRating;
    reason?: RateErrorReason;
    message?: string | null;
}

=======
>>>>>>> origin/Dashbords
export const getRateErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

<<<<<<< HEAD
const classify = (err: unknown): RateErrorReason => {
    if (!(err instanceof AxiosError)) return 'error';
    const status = err.response?.status ?? 0;
    if (status === 409) return 'already_rated';
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 400) return 'not_delivered'; // backend uses 400 for "must be delivered"
    if (status === 422) return 'invalid';
    if (
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        !err.response
    ) {
        return 'network';
    }
    return 'error';
};

interface SubmitArgs {
    orderId: string;
    payload: RateOrderPayload;
}

=======
>>>>>>> origin/Dashbords
export const useRateOrder = () => {
    const { rateOrder } = useOrderRepository();
    const queryClient = useQueryClient();

<<<<<<< HEAD
    const mutation = useMutation<OrderRating, AxiosError, SubmitArgs>({
        mutationFn: ({ orderId, payload }) => rateOrder(orderId, payload),
        retry: 0,
    });

    /**
     * Submit a rating. Returns a discriminated result rather than throwing so
     * the caller (the bottom sheet) can render inline messages without a
     * try/catch dance. On success, the order's cached `hasRating` flag is
     * patched so the rate CTA disappears immediately.
     */
    const submit = useCallback(
        async (args: SubmitArgs): Promise<RateOrderResult> => {
            try {
                const rating = await mutation.mutateAsync(args);
                queryClient.setQueryData<OrderDetails | undefined>(
                    [...ORDER_DETAILS_QUERY_KEY, args.orderId],
                    (current) =>
                        current
                            ? { ...current, hasRating: true, rating }
                            : current,
                );
                return { ok: true, rating };
            } catch (err) {
                const reason = classify(err);
                // If the server says "already rated", reflect that in the cache
                // so the CTA hides on next render — keeps the UI honest even if
                // a stale order detail allowed the user to retry.
                if (reason === 'already_rated') {
                    queryClient.setQueryData<OrderDetails | undefined>(
                        [...ORDER_DETAILS_QUERY_KEY, args.orderId],
                        (current) =>
                            current ? { ...current, hasRating: true } : current,
                    );
                }
                return {
                    ok: false,
                    reason,
                    message: getRateErrorMessage(err),
                };
            }
        },
        [mutation, queryClient],
    );

    return {
        submit,
        isSubmitting: mutation.isPending,
        reset: mutation.reset,
    };
=======
    return useMutation<void, AxiosError, Variables>({
        mutationFn: ({ orderId, rating, comment }) =>
            rateOrder(orderId, { rating, comment }),
        retry: 0,
        onSuccess: (_data, { orderId }) => {
            queryClient.invalidateQueries({ queryKey: [...ORDER_DETAILS_QUERY_KEY, orderId] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
>>>>>>> origin/Dashbords
};
