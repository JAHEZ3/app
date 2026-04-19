import { authApi, customerApi } from "../../../lib/api";
import { AuthRepository, CompleteProfileParams, VerifyParams } from "./AuthRepository";
import type { User } from "../entities/User";
import { toAdapter } from "../adapter/toAdapter";


export const restRepository = (): AuthRepository => {
    return {
        register: async (phone: string): Promise<void> => {
            const res = await authApi.post('/api/auth/customer/register', { phone });
            return res.data;
        },
        verify: async (params: VerifyParams): Promise<{ accessToken: string, refreshToken: string }> => {
            const res = await authApi.post('/api/auth/verify-otp', params);
            return res.data.data
        },
        resendOtp: async (phone: string): Promise<void> => {
            await authApi.post('/api/auth/resend-otp', { phone });
        },
    };
};
