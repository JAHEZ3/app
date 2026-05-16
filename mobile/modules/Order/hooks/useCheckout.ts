import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient, type MutateOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useOrderRepository } from '..';
import { CART_QUERY_KEY } from '@/modules/Cart/hooks/useAddToCart';
import type { CheckoutOrder, CheckoutPayload } from '../types';
import { generateUuidV4 } from '../utils/uuid';

export const ORDER_CHECKOUT_KEY = ['order', 'checkout'] as const;

interface CheckoutVariables {
    idempotencyKey: string;
    payload: CheckoutPayload;
}

type StartCheckoutOptions = MutateOptions<CheckoutOrder, AxiosError, CheckoutVariables>;

interface CheckoutApiErrorPayload {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

const axiosStatus = (err: unknown): number | null =>
    err instanceof AxiosError ? err.response?.status ?? null : null;

export const isCheckoutConflict = (err: unknown): boolean => axiosStatus(err) === 409;
export const isCheckoutBusinessError = (err: unknown): boolean => axiosStatus(err) === 422;
export const isCheckoutUnauthorized = (err: unknown): boolean => axiosStatus(err) === 401;
export const isNetworkError = (err: unknown): boolean =>
    err instanceof AxiosError &&
    (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !err.response);

export const getCheckoutErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as CheckoutApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    return null;
};

export const useCheckout = () => {
    const { checkout } = useOrderRepository();
    const queryClient = useQueryClient();
    const idempotencyKeyRef = useRef<string | null>(null);
    const [lastOrder, setLastOrder] = useState<CheckoutOrder | null>(null);

    const ensureIdempotencyKey = useCallback(() => {
        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = generateUuidV4();
        }
        return idempotencyKeyRef.current;
    }, []);

    const resetIdempotencyKey = useCallback(() => {
        idempotencyKeyRef.current = null;
    }, []);

    const mutation = useMutation<CheckoutOrder, AxiosError, CheckoutVariables>({
        mutationFn: ({ idempotencyKey, payload }) => checkout(payload, idempotencyKey),
        retry: 0,
        onSuccess: (order) => {
            setLastOrder(order);
            queryClient.setQueryData(CART_QUERY_KEY, null);
            queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });

    const shouldKeepKey = (err: AxiosError): boolean => {
        if (isNetworkError(err)) return true;
        if (isCheckoutConflict(err)) return true;
        const status = err.response?.status ?? 0;
        return status >= 500;
    };

    const startCheckout = useCallback(
        (payload: CheckoutPayload, options?: StartCheckoutOptions) => {
            const idempotencyKey = ensureIdempotencyKey();
            mutation.mutate(
                { idempotencyKey, payload },
                {
                    ...options,
                    onSuccess: (...args) => {
                        resetIdempotencyKey();
                        (options?.onSuccess as ((...a: typeof args) => void) | undefined)?.(
                            ...args,
                        );
                    },
                    onError: (...args) => {
                        if (!shouldKeepKey(args[0])) {
                            resetIdempotencyKey();
                        }
                        (options?.onError as ((...a: typeof args) => void) | undefined)?.(
                            ...args,
                        );
                    },
                },
            );
        },
        [ensureIdempotencyKey, mutation, resetIdempotencyKey],
    );

    const startCheckoutAsync = useCallback(
        async (payload: CheckoutPayload) => {
            const idempotencyKey = ensureIdempotencyKey();
            try {
                const order = await mutation.mutateAsync({ idempotencyKey, payload });
                resetIdempotencyKey();
                return order;
            } catch (err) {
                if (err instanceof AxiosError && !shouldKeepKey(err)) {
                    resetIdempotencyKey();
                } else if (!(err instanceof AxiosError)) {
                    resetIdempotencyKey();
                }
                throw err;
            }
        },
        [ensureIdempotencyKey, mutation, resetIdempotencyKey],
    );

    return useMemo(
        () => ({
            ...mutation,
            lastOrder,
            startCheckout,
            startCheckoutAsync,
            resetIdempotencyKey,
        }),
        [lastOrder, mutation, resetIdempotencyKey, startCheckout, startCheckoutAsync],
    );
};
