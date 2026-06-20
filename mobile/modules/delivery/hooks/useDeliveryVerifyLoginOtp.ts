import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';

/**
 * Verify a LOGIN OTP (the password-less sign-in fallback) and start a session.
 * Mirrors useDeliveryVerifyOtp but hits the delivery verify-login endpoint.
 */
export const useDeliveryVerifyLoginOtp = () => {
    const { verifyLoginOtp } = useDelivery();
    const { setTokens, setLastKnownStatus } = useDeliveryStore();

    return useMutation({
        mutationKey: ['delivery/verifyLoginOtp'],
        mutationFn: verifyLoginOtp,
        onSuccess: async (data) => {
            await SecureStore.setItemAsync('deliveryRefreshToken', data.refreshToken);
            // Fresh session — let the guard route by live profile, not stale cache.
            await SecureStore.deleteItemAsync('deliveryAgentStatus');
            setLastKnownStatus(null);
            setTokens(data.accessToken);
            router.replace('/delivery' as never);
        },
    });
};
