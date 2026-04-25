import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useDeliveryLogout = () => {
    const { logout } = useDelivery();
    const { clearTokens } = useDeliveryStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ['delivery/logout'],
        mutationFn: async () => {
            const refreshToken = await SecureStore.getItemAsync('deliveryRefreshToken');
            if (refreshToken) await logout(refreshToken);
        },
        onSettled: async () => {
            clearTokens();
            await SecureStore.deleteItemAsync('deliveryRefreshToken');
            queryClient.removeQueries({ queryKey: ['deliveryProfile'] });
            router.replace('/delivery/register' as never);
        },
    });
};
