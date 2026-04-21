import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import OnboardingScreen from "../modules/Onboarding/screens/OnboardingScreen";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function Onboarding() {
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasSeenOnboarding = useOnboardingStore((state) => state.hasSeenOnboarding);
  const forceShowOnboarding = useOnboardingStore((state) => state.forceShowOnboarding);
  const [isReady, setIsReady] = useState(() => useOnboardingStore.persist.hasHydrated());

  useEffect(() => {
    if (useOnboardingStore.persist.hasHydrated()) {
      setIsReady(true);
      return;
    }

    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setIsReady(true);
    });

    return unsub;
  }, []);

  if (!isReady || status === "idle" || status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasSeenOnboarding && !forceShowOnboarding) {
    return <Redirect href={accessToken ? "/home/Home" : "/auth/login"} />;
  }

  return <OnboardingScreen />;
}
