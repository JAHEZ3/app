import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "../../../lib/api";
import { AuthRepository, VerifyParams } from "./AuthRepository";


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
        logout: async (refreshToken: string): Promise<void> => {
            const res = await authApi.delete('/api/auth/logout', {
                data: { refreshToken },
            });
            console.log(res.data, 'response api');
            console.log(refreshToken, 'refreshToken api');
        },
    };
};
