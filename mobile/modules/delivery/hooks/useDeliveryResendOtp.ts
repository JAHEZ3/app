import { useMutation } from '@tanstack/react-query';
import { useDelivery } from '..';
import { useDeliveryPhoneStore } from '@/store/useDeliveryPhoneStore';

/**
 * Resend the OTP for whichever flow the driver is in. Registration uses the
 * phone-verify resend; the OTP-login fallback re-sends a login code.
 */
export const useDeliveryResendOtp = () => {
    const { resendOtp, sendLoginOtp } = useDelivery();
    const { otpMode } = useDeliveryPhoneStore();

    return useMutation({
        mutationKey: ['delivery/resendOtp', otpMode],
        mutationFn: (phone: string) =>
            otpMode === 'login' ? sendLoginOtp(phone) : resendOtp(phone),
    });
};
