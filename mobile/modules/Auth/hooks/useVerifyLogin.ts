import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuth } from '..';
import { useAuthStore } from '@/store/useAuthStore';
import { decodeJwtPayload } from '../utils/decodeToken';

export const useVerifyLogin = () => {
    const { verifyLogin } = useAuth();
    const { setTokens } = useAuthStore();

    return useMutation({
        mutationKey: ['verifyLogin'],
        mutationFn: verifyLogin,
        onSuccess: async (data) => {
            await SecureStore.setItemAsync('refreshToken', data.refreshToken);
            setTokens(data.accessToken);
            const { profileCompleted } = decodeJwtPayload(data.accessToken);
            router.replace(profileCompleted ? '/home/Home' : '/auth/complete-profile');
        },
    });
};
