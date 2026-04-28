import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useDeliveryLogin = () => {
    const { login } = useDelivery();
    const { setTokens } = useDeliveryStore();

    return useMutation({
        mutationKey: ['delivery/login'],
        mutationFn: login,
        onSuccess: async (data) => {
            await SecureStore.setItemAsync('deliveryRefreshToken', data.refreshToken);
            setTokens(data.accessToken);
            router.replace('/delivery' as never);
        },
    });
};
