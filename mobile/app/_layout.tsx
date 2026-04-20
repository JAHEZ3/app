import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { useAuthInit } from "@/hooks/useAuthInit";
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
import { createProfileModule } from "@/modules/Profile/index";


import { QueryClientProvider , QueryClient} from '@tanstack/react-query';



SplashScreen.preventAutoHideAsync();



const { Provider: AuthProvider } = createAuthModule();
const { Provider: ProfileProvider } = createProfileModule();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // keep cache for 24 hours
    },
  },
});

export default function RootLayout() {
  useAuthInit();

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
        <ProfileProvider>
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/otp" />
            <Stack.Screen name="auth/complete-profile" />
            <Stack.Screen name="home/Home" />
          </Stack>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
