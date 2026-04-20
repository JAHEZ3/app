import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import CompleteProfileScreen from "../../modules/Profile/screens/CompleteProfileScreen";

export default function CompleteProfile() {
    return <ProtectedRoute redirectTo="/auth/login" requireAuth>
        <CompleteProfileScreen />
    </ProtectedRoute>
}
