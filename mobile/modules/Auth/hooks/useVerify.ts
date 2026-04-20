import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '..';
import { useAuthStore } from '@/store/useAuthStore';

export const useVerify = () => {
    const { verify } = useAuth();
    const { setTokens } = useAuthStore();

    return useMutation({
        mutationKey: ['verify'],
        mutationFn: verify,
        onSuccess: async (data) => {
            await SecureStore.setItemAsync('refreshToken', data.refreshToken);
            setTokens(data.accessToken);
        },
    });
};
