import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const secureStorage = createJSONStorage(() => ({
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}));

interface OnboardingState {
  hasSeenOnboarding: boolean;
  forceShowOnboarding: boolean;
  markOnboardingSeen: () => void;
  triggerOnboardingAfterLogout: () => void;
  clearForcedOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      forceShowOnboarding: false,
      markOnboardingSeen: () =>
        set({ hasSeenOnboarding: true, forceShowOnboarding: false }),
      triggerOnboardingAfterLogout: () =>
        set({ forceShowOnboarding: true }),
      clearForcedOnboarding: () =>
        set({ forceShowOnboarding: false }),
    }),
    {
      name: "app-onboarding",
      storage: secureStorage,
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        forceShowOnboarding: state.forceShowOnboarding,
      }),
    }
  )
);
