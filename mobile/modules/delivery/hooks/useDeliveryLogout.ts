import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useDeliveryLogout = () => {
    const { logout } = useDelivery();
    const { clearTokens, setLastKnownStatus } = useDeliveryStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ['delivery/logout'],
        mutationFn: async () => {
            const refreshToken = await SecureStore.getItemAsync('deliveryRefreshToken');
            if (refreshToken) await logout(refreshToken);
        },
        onSettled: async () => {
            // Clear lastKnownStatus so the guard doesn't flash a stale screen
            // if the user logs back in with a different account or changed status.
            setLastKnownStatus(null);
            clearTokens();
            await SecureStore.deleteItemAsync('deliveryRefreshToken');
            await SecureStore.deleteItemAsync('deliveryAgentStatus');
            queryClient.removeQueries({ queryKey: ['deliveryProfile'] });
            // Register screen defaults to the login tab — no extra param needed.
            router.replace('/delivery/register' as never);
        },
    });
};
