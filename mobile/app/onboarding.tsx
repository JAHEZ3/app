import { ProtectedRoute } from "@/hooks/useProtectedRoute";
import OnboardingScreen from "../modules/Onboarding/screens/OnboardingScreen";

export default function Onboarding() {
  return (
      <ProtectedRoute redirectTo="/auth/login" requireAuth={false}>
        <OnboardingScreen />
      </ProtectedRoute>
  );
}
