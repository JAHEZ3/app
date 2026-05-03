import { AxiosError } from 'axios';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import type { Cart, CartResponse } from '../types';
import { CartRepository } from './CartRepository';

const BASE = '/api/order/cart';

const normalizeCart = (raw: CartResponse['data'] | undefined): Cart | null => {
    if (!raw || raw.items.length === 0) return null;
    const cart = raw as Cart;
    if (!cart.restaurantId) return null;
    return cart;
};

const logRequest = (method: string, url: string, body?: unknown) => {
    const token = useAuthStore.getState().accessToken;
    console.log(`[cart] → ${method} ${url}`, {
        hasToken: !!token,
        tokenPreview: token ? `${token.slice(0, 12)}…` : null,
        body,
    });
};

const logError = (label: string, err: unknown) => {
    if (err instanceof AxiosError) {
        console.log(`[cart] ✗ ${label}`, {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
            code: err.code,
            url: err.config?.url,
        });
    } else {
        console.log(`[cart] ✗ ${label} (non-axios)`, err);
    }
};

export const restRepository = (): CartRepository => ({
    getCart: async (): Promise<Cart | null> => {
        logRequest('GET', BASE);
        try {
            const res = await orderApi.get<CartResponse>(BASE);
            console.log('[cart] ← GET response', res.data);
            return normalizeCart(res.data.data);
        } catch (err) {
            logError('getCart', err);
            throw err;
        }
    },

    addItem: async (input): Promise<Cart> => {
        logRequest('POST', `${BASE}/items`, input);
        try {
            const res = await orderApi.post<CartResponse>(`${BASE}/items`, input);
            console.log('[cart] ← POST response', res.data);
            return res.data.data as Cart;
        } catch (err) {
            logError('addItem', err);
            throw err;
        }
    },

    updateItem: async (mealId, input): Promise<Cart | null> => {
        logRequest('PATCH', `${BASE}/items/${mealId}`, input);
        try {
            const res = await orderApi.patch<CartResponse>(`${BASE}/items/${mealId}`, input);
            console.log('[cart] ← PATCH response', res.data);
            return normalizeCart(res.data.data);
        } catch (err) {
            logError('updateItem', err);
            throw err;
        }
    },

    removeItem: async (mealId): Promise<Cart | null | undefined> => {
        logRequest('DELETE', `${BASE}/items/${mealId}`);
        try {
            const res = await orderApi.delete<CartResponse | undefined>(`${BASE}/items/${mealId}`);
            console.log('[cart] <- DELETE response', res.data);
            if (!res.data) return undefined;
            return normalizeCart(res.data.data);
        } catch (err) {
            logError('removeItem', err);
            throw err;
        }
    },

    clearCart: async (): Promise<Cart | null | undefined> => {
        logRequest('DELETE', BASE);
        try {
            const res = await orderApi.delete<CartResponse | undefined>(BASE);
            console.log('[cart] <- DELETE cart response', res.data);
            if (!res.data) return undefined;
            return normalizeCart(res.data.data);
        } catch (err) {
            logError('clearCart', err);
            throw err;
        }
    },
});
