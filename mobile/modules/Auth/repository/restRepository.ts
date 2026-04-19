import { api } from "../../../lib/api";
import { AuthRepository, CompleteProfileParams, VerifyParams } from "./AuthRepository";
import type { User } from "../entities/User";
import { toAdapter } from "../adapter/toAdapter";



export const restRepository = (): AuthRepository => {
    return {
        register: async (phone: string): Promise<void> => {
            const res = await api.post('/api/auth/customer/register', { phone });
            return res.data;
        },
        verify: async (params: VerifyParams): Promise<{ accessToken: string, refreshToken: string }> => {
            const res = await api.post('/api/auth/verify-otp', params);
            return res.data.data
        },
        resendOtp: async (phone: string): Promise<void> => {
            await api.post('/api/auth/resend-otp', { phone });
        },
        completeProfile: async (params: CompleteProfileParams): Promise<User> => {
            const res = await api.post('/api/auth/customer/complete-profile', params);
            return toAdapter(res.data);
        },
    };
};
