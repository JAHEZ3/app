import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useDeliveryVerifyOtp = () => {
    const { verifyOtp } = useDelivery();
    const { setTokens, setLastKnownStatus } = useDeliveryStore();

    return useMutation({
        mutationKey: ['delivery/verifyOtp'],
        mutationFn: verifyOtp,
        onSuccess: async (data) => {
            await SecureStore.setItemAsync('deliveryRefreshToken', data.refreshToken);
            // New OTP = fresh session; clear stale status so the guard routes by
            // real profile data instead of a previous session's cached state
            await SecureStore.deleteItemAsync('deliveryAgentStatus');
            setLastKnownStatus(null);
            setTokens(data.accessToken);
            router.replace('/delivery' as never);
        },
    });
};
