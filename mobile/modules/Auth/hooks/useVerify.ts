import { useMutation } from "@tanstack/react-query";
import { useAuth } from ".."

export const useVerify = () => {
    const { verify } = useAuth();
    return useMutation({
        mutationKey: ["verify"],
        mutationFn: verify,
        onSuccess: (data) => {
            console.log(data, 'from berify');
        }
    });
}