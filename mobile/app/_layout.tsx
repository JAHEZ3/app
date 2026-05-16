import "../global.css";
import "@/lib/i18n";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useLanguageInit } from "@/hooks/useLanguageInit";
import { useAuthInit } from "@/hooks/useAuthInit";
import { useDeliveryInit } from "@/hooks/useDeliveryInit";
import { useRealtime } from "@/hooks/useRealtime";
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
import { createCartModule } from "@/modules/Cart/index";
import { createOrderModule } from "@/modules/Order/index";

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

const { Provider: AuthProvider } = createAuthModule();
const { Provider: ProfileProvider } = createProfileModule();
const { Provider: DeliveryProvider } = createDeliveryModule();
const { Provider: RestaurantsProvider } = createRestaurantsModule();
const { Provider: CartProvider } = createCartModule();
const { Provider: OrderProvider } = createOrderModule();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

function RealtimeBridge() {
  useRealtime();
  return null;
}

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
      <RealtimeBridge />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ProfileProvider>
            <DeliveryProvider>
              <RestaurantsProvider>
                <CartProvider>
                  <OrderProvider>
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
                      <Stack.Screen name="cart" />
                      <Stack.Screen name="checkout/index" />
                      <Stack.Screen name="checkout/success" options={{ gestureEnabled: false }} />
                      <Stack.Screen name="orders/index" />
                      <Stack.Screen name="orders/[id]/index" />
                      <Stack.Screen
                        name="orders/[id]/track"
                        options={{ animation: "fade", presentation: "modal" }}
                      />
                      <Stack.Screen name="profile/index" />
                    </Stack>
                  </OrderProvider>
                </CartProvider>
              </RestaurantsProvider>
            </DeliveryProvider>
          </ProfileProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
