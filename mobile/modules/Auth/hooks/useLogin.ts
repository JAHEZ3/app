import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "..";
import { usePhoneNumber } from "@/store/usePhoneNumber";

export const useLogin = () => {
    const { login } = useAuth();
    const { setFlow } = usePhoneNumber();

    return useMutation({
        mutationKey: ["login"],
        mutationFn: login,
        onSuccess: (_, phone) => {
            setFlow(phone, 'login');
            router.push("/auth/otp");
        },
    });
};
