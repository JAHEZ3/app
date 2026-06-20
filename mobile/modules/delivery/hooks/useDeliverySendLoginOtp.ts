import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDelivery } from '..';
import { useDeliveryPhoneStore } from '@/store/useDeliveryPhoneStore';

/**
 * Explicit "sign in with a code" path from the login screen. Sends a login OTP
 * to an existing account and forwards to the OTP screen in 'login' mode.
 */
export const useDeliverySendLoginOtp = () => {
    const { sendLoginOtp } = useDelivery();
    const { setPhoneNumber, setOtpMode } = useDeliveryPhoneStore();

    return useMutation({
        mutationKey: ['delivery/sendLoginOtp'],
        mutationFn: sendLoginOtp,
        onSuccess: (_, phone) => {
            setPhoneNumber(phone);
            setOtpMode('login');
            router.push('/delivery/otp' as never);
        },
    });
};
