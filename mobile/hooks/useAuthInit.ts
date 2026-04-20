import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/lib/api';

export const useAuthInit = () => {
    const { setTokens, clearTokens, setStatus } = useAuthStore();

    useEffect(() => {
        const restore = async () => {
            setStatus('loading');
            try {
                const storedRefresh = await SecureStore.getItemAsync('refreshToken');
                if (!storedRefresh) {
                    console.log('No refreshToken stored!');
                    
                    clearTokens();
                    return;
                }

                const res = await authApi.post('/api/auth/refresh', { refreshToken: storedRefresh });
                const { accessToken, refreshToken: newRefreshToken } = res.data.data;

                console.log(accessToken, newRefreshToken, 'from init');
                

                await SecureStore.setItemAsync('refreshToken', newRefreshToken);
                setTokens(accessToken);
            } catch {
                await SecureStore.deleteItemAsync('refreshToken');
                clearTokens();
            }
        };

        restore();
    }, []);
};
