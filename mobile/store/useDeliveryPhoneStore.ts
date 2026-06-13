import { create } from 'zustand';

/**
 * Which OTP flow the driver is currently in, so the shared OTP screen knows
 * which verify endpoint to call:
 *   'register' → verify-otp (PHONE_VERIFY, registration)
 *   'login'    → delivery/verify-login (LOGIN, OTP sign-in fallback)
 */
export type DeliveryOtpMode = 'register' | 'login';

interface DeliveryPhoneState {
    /** Canonical E.164 phone carried between the auth screens. */
    phoneNumber: string;
    otpMode: DeliveryOtpMode;
    setPhoneNumber: (phoneNumber: string) => void;
    setOtpMode: (mode: DeliveryOtpMode) => void;
}

export const useDeliveryPhoneStore = create<DeliveryPhoneState>((set) => ({
    phoneNumber: '',
    otpMode: 'register',
    setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
    setOtpMode: (otpMode) => set({ otpMode }),
}));
