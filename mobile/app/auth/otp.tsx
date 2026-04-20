import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import OTPScreen from "../../modules/Auth/screens/OTPScreen";

export default function OTP() {
    return <ProtectedRoute redirectTo="/auth/login" requireAuth={false}>
        <OTPScreen />
    </ProtectedRoute>
}
