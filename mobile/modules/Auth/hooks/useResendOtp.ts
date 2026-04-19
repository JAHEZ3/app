import { useMutation } from "@tanstack/react-query";
import { useAuth } from "..";

export const useResendOtp = () => {
    const { resendOtp } = useAuth();

    return useMutation({
        mutationKey: ["resend-otp"],
        mutationFn: resendOtp,
    });
};
