import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import LoginScreen from "../../modules/Auth/screens/LoginScreen";

export default function Login() {
    
    return <ProtectedRoute redirectTo="/home/Home" requireAuth={false}>
        <LoginScreen />
    </ProtectedRoute>
}
