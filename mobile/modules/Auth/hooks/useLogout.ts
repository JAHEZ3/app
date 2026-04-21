import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { useAuth } from "..";
import { useAuthStore } from "@/store/useAuthStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";

const clearSession = async (
    clearTokens: () => void,
    triggerOnboardingAfterLogout: () => void,
    queryClient: ReturnType<typeof useQueryClient>
) => {
    clearTokens();
    triggerOnboardingAfterLogout();
    await SecureStore.deleteItemAsync('refreshToken');
    queryClient.clear();
    router.replace('/');
};

export const useLogout = () => {
    const { logout } = useAuth();
    const { clearTokens } = useAuthStore();
    const { triggerOnboardingAfterLogout } = useOnboardingStore();
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
        onSuccess: () => clearSession(clearTokens, triggerOnboardingAfterLogout, queryClient),
        onError: () => clearSession(clearTokens, triggerOnboardingAfterLogout, queryClient),
    });
};
