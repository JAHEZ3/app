import { useMutation } from "@tanstack/react-query";
import { useAuth } from "..";
import { useToken } from "@/store/useToken";
import * as SecureStore from 'expo-secure-store';

export const useVerify = () => {
    const { verify } = useAuth();
    const { setAccessToken } = useToken();

    return useMutation({
        mutationKey: ["verify"],
        mutationFn: verify,
        onSuccess: async (data) => {
            try {
                setAccessToken(data.accessToken);
                await SecureStore.setItemAsync('refreshToken', data.refreshToken);
            } catch (error) {
                console.log(error);
            }
        },
        onError(error) {
            console.log(error);
        }
    });
};