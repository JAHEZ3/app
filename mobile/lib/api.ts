import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/useAuthStore';

export const authApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_AUTH,
    timeout: 10000,
});

export const customerApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_CUSTOMER,
    timeout: 10000,
});

export const deliveryApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_DELIVERY,
    timeout: 10000,
});

export const restaurantApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_RESTAURANT,
    timeout: 10000,
});

export const orderApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL_ORDER,
    timeout: 10000,
});

// ─── Customer interceptors ───────────────────────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

const drainQueue = (error: unknown, token: string | null) => {
    pendingQueue.forEach(({ resolve, reject }) =>
        token ? resolve(token) : reject(error)
    );
    pendingQueue = [];
};

customerApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

customerApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        if (useAuthStore.getState().status === 'unauthenticated') {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                pendingQueue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return customerApi(original);
            });
        }

        original._retry = true;
        isRefreshing = true;

        try {
            const storedRefresh = await SecureStore.getItemAsync('refreshToken');
            if (!storedRefresh) throw new Error('No refresh token');

            const res = await authApi.post('/api/auth/refresh', { refreshToken: storedRefresh });
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;

            await SecureStore.setItemAsync('refreshToken', newRefreshToken);
            useAuthStore.getState().setTokens(accessToken);

            drainQueue(null, accessToken);

            original.headers.Authorization = `Bearer ${accessToken}`;
            return customerApi(original);
        } catch (e) {
            drainQueue(e, null);
            useAuthStore.getState().clearTokens();
            await SecureStore.deleteItemAsync('refreshToken');
            return Promise.reject(e);
        } finally {
            isRefreshing = false;
        }
    }
);

// ─── Order interceptors (use customer auth) ─────────────────────────────────

orderApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

orderApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        if (useAuthStore.getState().status === 'unauthenticated') {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                pendingQueue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return orderApi(original);
            });
        }

        original._retry = true;
        isRefreshing = true;

        try {
            const storedRefresh = await SecureStore.getItemAsync('refreshToken');
            if (!storedRefresh) throw new Error('No refresh token');

            const res = await authApi.post('/api/auth/refresh', { refreshToken: storedRefresh });
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;

            await SecureStore.setItemAsync('refreshToken', newRefreshToken);
            useAuthStore.getState().setTokens(accessToken);

            drainQueue(null, accessToken);

            original.headers.Authorization = `Bearer ${accessToken}`;
            return orderApi(original);
        } catch (e) {
            drainQueue(e, null);
            useAuthStore.getState().clearTokens();
            await SecureStore.deleteItemAsync('refreshToken');
            return Promise.reject(e);
        } finally {
            isRefreshing = false;
        }
    }
);

// ─── Delivery interceptors ───────────────────────────────────────────────────

let isDeliveryRefreshing = false;
let deliveryPendingQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

const drainDeliveryQueue = (error: unknown, token: string | null) => {
    deliveryPendingQueue.forEach(({ resolve, reject }) =>
        token ? resolve(token) : reject(error)
    );
    deliveryPendingQueue = [];
};

deliveryApi.interceptors.request.use((config) => {
    // Lazy-import to avoid circular deps at module load time
    const { useDeliveryStore } = require('@/store/useDeliveryStore');
    const token = useDeliveryStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

deliveryApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const { useDeliveryStore } = require('@/store/useDeliveryStore');
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        if (useDeliveryStore.getState().authStatus === 'unauthenticated') {
            return Promise.reject(error);
        }

        if (isDeliveryRefreshing) {
            return new Promise<string>((resolve, reject) => {
                deliveryPendingQueue.push({ resolve, reject });
            }).then((token) => {
                original.headers.Authorization = `Bearer ${token}`;
                return deliveryApi(original);
            });
        }

        original._retry = true;
        isDeliveryRefreshing = true;

        try {
            const storedRefresh = await SecureStore.getItemAsync('deliveryRefreshToken');
            if (!storedRefresh) throw new Error('No delivery refresh token');

            const res = await authApi.post('/api/auth/refresh', { refreshToken: storedRefresh });
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;

            await SecureStore.setItemAsync('deliveryRefreshToken', newRefreshToken);
            useDeliveryStore.getState().setTokens(accessToken);

            drainDeliveryQueue(null, accessToken);

            original.headers.Authorization = `Bearer ${accessToken}`;
            return deliveryApi(original);
        } catch (e) {
            drainDeliveryQueue(e, null);
            useDeliveryStore.getState().clearTokens();
            await SecureStore.deleteItemAsync('deliveryRefreshToken');
            return Promise.reject(e);
        } finally {
            isDeliveryRefreshing = false;
        }
    }
);
