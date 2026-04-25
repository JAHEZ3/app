import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

export const useDeliveryVerifyOtp = () => {
    const { verifyOtp } = useDelivery();
    const { setTokens } = useDeliveryStore();

    return useMutation({
        mutationKey: ['delivery/verifyOtp'],
        mutationFn: verifyOtp,
        onSuccess: async (data) => {
            await SecureStore.setItemAsync('deliveryRefreshToken', data.refreshToken);
            setTokens(data.accessToken);
            // After OTP verification status is SUSPENDED → go to entry which routes to application
            router.replace('/delivery' as never);
        },
    });
};
