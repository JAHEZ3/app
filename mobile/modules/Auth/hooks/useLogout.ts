import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { useAuth } from "..";
import { useAuthStore } from "@/store/useAuthStore";

const clearSession = async (
    clearTokens: () => void,
    queryClient: ReturnType<typeof useQueryClient>
) => {
    clearTokens();                                    
    await SecureStore.deleteItemAsync('refreshToken');
    queryClient.clear();
    router.replace('/auth/login');
};

export const useLogout = () => {
    const { logout } = useAuth();
    const { clearTokens } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["logout"],
        mutationFn: async () => {
            await queryClient.cancelQueries();

            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (refreshToken) {
                await logout(refreshToken);
            }
        },
        onSuccess: () => clearSession(clearTokens, queryClient),
        onError: () => clearSession(clearTokens, queryClient),
    });
};
