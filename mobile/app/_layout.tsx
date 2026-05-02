import "../global.css";
import "@/lib/i18n";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { useLanguageInit } from "@/hooks/useLanguageInit";
import { useAuthInit } from "@/hooks/useAuthInit";
import { useDeliveryInit } from "@/hooks/useDeliveryInit";
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
import { createDeliveryModule } from "@/modules/delivery/index";
import { createRestaurantsModule } from "@/modules/Restaurants/index";

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

const { Provider: AuthProvider } = createAuthModule();
const { Provider: ProfileProvider } = createProfileModule();
const { Provider: DeliveryProvider } = createDeliveryModule();
const { Provider: RestaurantsProvider } = createRestaurantsModule();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

export default function RootLayout() {
  useAuthInit();
  useDeliveryInit();
  const i18nReady = useLanguageInit();

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, i18nReady]);

  if (!fontsLoaded || !i18nReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <DeliveryProvider>
            <RestaurantsProvider>
              <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="auth/login" options={{ gestureEnabled: false }} />
                <Stack.Screen name="auth/terms" />
                <Stack.Screen name="auth/otp" options={{ gestureEnabled: false }} />
                <Stack.Screen name="auth/complete-profile" options={{ gestureEnabled: false }} />
                <Stack.Screen name="home/Home" options={{ gestureEnabled: false }} />
                <Stack.Screen name="delivery" options={{ gestureEnabled: false }} />
                <Stack.Screen name="restaurants/index" />
                <Stack.Screen name="restaurants/[id]" />
                <Stack.Screen name="profile/index" />
              </Stack>
            </RestaurantsProvider>
          </DeliveryProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
