import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: ReadonlyArray<SupportedLanguage> = ['ar'];

export function isRTLLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
}

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
export const initialLanguage: SupportedLanguage = SUPPORTED_LANGUAGES.includes(
  deviceLocale as SupportedLanguage
)
  ? (deviceLocale as SupportedLanguage)
  : 'en';

const localeMap: Record<string, Record<string, () => Promise<unknown>>> = {
  en: {
    common: () => import('../locales/en/common.json'),
    auth: () => import('../locales/en/auth.json'),
    home: () => import('../locales/en/home.json'),
    profile: () => import('../locales/en/profile.json'),
    orders: () => import('../locales/en/orders.json'),
  },
  ar: {
    common: () => import('../locales/ar/common.json'),
    auth: () => import('../locales/ar/auth.json'),
    home: () => import('../locales/ar/home.json'),
    profile: () => import('../locales/ar/profile.json'),
    orders: () => import('../locales/ar/orders.json'),
  },
};

i18n
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        localeMap[language]?.[namespace]?.()
    )
  )
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'common',
    ns: ['common', 'auth', 'home', 'profile', 'orders'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    load: 'languageOnly',
    preload: [initialLanguage],
  });

export default i18n;
