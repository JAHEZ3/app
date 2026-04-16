import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from "@expo-google-fonts/tajawal";
import * as SplashScreen from "expo-splash-screen";
import { createAuthModule } from "@/modules/Auth/index";

import { QueryClientProvider , QueryClient} from '@tanstack/react-query';


SplashScreen.preventAutoHideAsync();



const { Provider: AuthProvider } = createAuthModule();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="complete-profile" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
