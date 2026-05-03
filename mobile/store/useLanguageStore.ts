import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';
import i18n, { SupportedLanguage, isRTLLanguage, initialLanguage } from '@/lib/i18n';

const secureStorage = createJSONStorage(() => ({
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}));

interface LanguageState {
  language: SupportedLanguage;
  isRTL: boolean;
  isChanging: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  applyStoredLanguage: () => void;
}

const applyNativeDirection = (lang: SupportedLanguage) => {
  const rtl = isRTLLanguage(lang);
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(false);
  I18nManager.forceRTL(rtl);
  return rtl;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: initialLanguage,
      isRTL: isRTLLanguage(initialLanguage),
      isChanging: false,

      setLanguage: async (lang: SupportedLanguage) => {
        set({ isChanging: true });
        await i18n.changeLanguage(lang);
        set({ language: lang, isRTL: applyNativeDirection(lang), isChanging: false });
      },

      applyStoredLanguage: () => {
        const { language } = get();
        const rtl = applyNativeDirection(language);
        if (i18n.language !== language) {
          i18n.changeLanguage(language);
        }
        set({ isRTL: rtl });
      },
    }),
    {
      name: 'app-language',
      storage: secureStorage,
      partialize: (state) => ({ language: state.language }),
    }
  )
);
