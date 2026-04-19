import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "..";

export const useCompleteProfile = () => {
    const { completeProfile } = useProfile();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["completeProfile"],
        mutationFn: completeProfile,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
};
