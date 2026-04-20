import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "../../../lib/api";
import { AuthRepository, VerifyLoginParams, VerifyParams } from "./AuthRepository";

export const restRepository = (): AuthRepository => ({
    register: async (phone) => {
        await authApi.post('/api/auth/customer/register', { phone });
    },

    login: async (phone) => {
        await authApi.post('/api/auth/customer/login', { phone });
    },

    verify: async (params: VerifyParams) => {
        const res = await authApi.post('/api/auth/verify-otp', params);
        return res.data.data;
    },

    verifyLogin: async (params: VerifyLoginParams) => {
        const res = await authApi.post('/api/auth/customer/verify-login', params);
        return res.data.data;
    },

    resendOtp: async (phone) => {
        await authApi.post('/api/auth/resend-otp', { phone });
    },

    logout: async (refreshToken) => {
        const accessToken = useAuthStore.getState().accessToken;
        await authApi.delete('/api/auth/logout', {
            data: { refreshToken },
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
    },
});
