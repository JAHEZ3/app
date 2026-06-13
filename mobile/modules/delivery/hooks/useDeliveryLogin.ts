import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { useDeliveryPhoneStore } from '@/store/useDeliveryPhoneStore';

/**
 * Phone + password login. On success we persist the refresh token and route
 * through the guard. If the backend says the account has no password yet
 * (`needsOtp`), we transparently switch to the OTP-login fallback: send a code
 * and forward to the OTP screen in 'login' mode.
 */
export const useDeliveryLogin = () => {
    const { login, sendLoginOtp } = useDelivery();
    const { setTokens } = useDeliveryStore();
    const { setPhoneNumber, setOtpMode } = useDeliveryPhoneStore();

    return useMutation({
        mutationKey: ['delivery/login'],
        mutationFn: login,
        onSuccess: async (result) => {
            if (result.kind === 'needsOtp') {
                await sendLoginOtp(result.phone);
                setPhoneNumber(result.phone);
                setOtpMode('login');
                router.push('/delivery/otp' as never);
                return;
            }
            await SecureStore.setItemAsync('deliveryRefreshToken', result.tokens.refreshToken);
            setTokens(result.tokens.accessToken);
            router.replace('/delivery' as never);
        },
    });
};
