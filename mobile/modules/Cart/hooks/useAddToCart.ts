import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useCartRepository } from '..';
import type { AddToCartInput, Cart } from '../types';

export const CART_QUERY_KEY = ['cart'] as const;

interface ApiErrorPayload {
    message?: string | string[];
    error?: string;
    statusCode?: number;
}

export const getAddToCartErrorMessage = (err: unknown): string | null => {
    if (!(err instanceof AxiosError)) return null;
    const payload = err.response?.data as ApiErrorPayload | undefined;
    const raw = payload?.message;
    if (Array.isArray(raw)) return raw[0] ?? null;
    if (typeof raw === 'string') return raw;
    if (err.response?.status === 401) return 'الرجاء تسجيل الدخول أولاً';
    if (err.code === 'ECONNABORTED') return 'انتهت مهلة الاتصال — تحقق من الشبكة';
    if (err.code === 'ERR_NETWORK') return 'تعذر الاتصال بالخادم';
    return err.message;
};

export const useAddToCart = () => {
    const { addItem } = useCartRepository();
    const queryClient = useQueryClient();

    return useMutation<Cart, AxiosError, AddToCartInput>({
        mutationFn: (input) => addItem(input),
        retry: 0,
        onSuccess: (cart) => {
            queryClient.setQueryData(CART_QUERY_KEY, cart);
        },
    });
};
