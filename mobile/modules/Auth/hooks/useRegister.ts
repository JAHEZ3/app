import { useMutation } from "@tanstack/react-query";
import { useAuth } from "..";

export const useRegister = () => {
    const { register } = useAuth();

    return useMutation({
        mutationKey: ["register"],
        mutationFn: register,
    });
};
