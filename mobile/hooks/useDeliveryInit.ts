import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { authApi } from '@/lib/api';
import type { DeliveryAgentStatus } from '@/modules/delivery/types';

// Hard cap on the refresh call — React Native axios timeouts can stall on weak
// networks (connection is established but no data flows), so we add our own race.
const REFRESH_TIMEOUT_MS = 8_000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`delivery refresh timed out after ${ms}ms`)), ms)
        ),
    ]);

export const useDeliveryInit = () => {
    const { setTokens, clearTokens, setAuthStatus, setLastKnownStatus } = useDeliveryStore();

    useEffect(() => {
        const restore = async () => {
            setAuthStatus('loading');
            try {
                const storedRefresh = await SecureStore.getItemAsync('deliveryRefreshToken');
                if (!storedRefresh) {
                    console.log('[useDeliveryInit] No refresh token found — unauthenticated');
                    clearTokens();
                    return;
                }

                // Restore cached status BEFORE the HTTP call so the guard can
                // route instantly as soon as setTokens() makes isAuthReady true.
                const cachedStatus = await SecureStore.getItemAsync('deliveryAgentStatus');
                if (cachedStatus) {
                    // Always normalize to uppercase — old cache entries may be lowercase.
                    const normalized = cachedStatus.toUpperCase() as DeliveryAgentStatus;
                    console.log('[useDeliveryInit] Restored cached status:', normalized);
                    setLastKnownStatus(normalized);
                }

                console.log('[useDeliveryInit] Calling refresh endpoint…');
                const res = await withTimeout(
                    authApi.post('/api/auth/refresh', { refreshToken: storedRefresh }),
                    REFRESH_TIMEOUT_MS,
                );
                const { accessToken, refreshToken: newRefreshToken } = res.data.data;
                await SecureStore.setItemAsync('deliveryRefreshToken', newRefreshToken);
                console.log('[useDeliveryInit] Tokens refreshed successfully');
                setTokens(accessToken);
            } catch (err) {
                console.warn('[useDeliveryInit] Restore failed:', (err as Error).message);
                await SecureStore.deleteItemAsync('deliveryRefreshToken');
                clearTokens();
            }
        };

        restore();
    }, []);
};
