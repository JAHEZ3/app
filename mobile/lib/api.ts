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

// --- Token refresh queue ---
// Prevents multiple simultaneous refresh calls when concurrent requests all 401.
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

// --- Request interceptor ---
customerApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Response interceptor ---
customerApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        // Already logged out — don't attempt refresh, just reject cleanly.
        if (useAuthStore.getState().status === 'unauthenticated') {
            return Promise.reject(error);
        }

        // Queue this request while a refresh is already in progress.
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

            // Rotate both tokens.
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
