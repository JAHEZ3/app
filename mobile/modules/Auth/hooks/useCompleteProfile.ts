import { useMutation } from "@tanstack/react-query";
import { useAuth } from "..";

export const useCompleteProfile = () => {
    const { completeProfile } = useAuth();

    return useMutation({
        mutationKey: ["completeProfile"],
        mutationFn: completeProfile,
    });
};
