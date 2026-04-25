import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { authApi } from '@/lib/api';

export const useDeliveryInit = () => {
    const { setTokens, clearTokens, setAuthStatus } = useDeliveryStore();

    useEffect(() => {
        const restore = async () => {
            setAuthStatus('loading');
            try {
                const storedRefresh = await SecureStore.getItemAsync('deliveryRefreshToken');
                if (!storedRefresh) {
                    clearTokens();
                    return;
                }
                const res = await authApi.post('/api/auth/refresh', { refreshToken: storedRefresh });
                const { accessToken, refreshToken: newRefreshToken } = res.data.data;
                await SecureStore.setItemAsync('deliveryRefreshToken', newRefreshToken);
                setTokens(accessToken);
            } catch {
                await SecureStore.deleteItemAsync('deliveryRefreshToken');
                clearTokens();
            }
        };

        restore();
    }, []);
};
