import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ur from './locales/ur.json';

export const SUPPORTED_LANGUAGES = ['en', 'ur'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const RTL_LANGUAGES: SupportedLanguage[] = ['ur'];

const resources = {
  en: { translation: en },
  ur: { translation: ur },
};

export function applyDirection(language: string) {
  const dir = RTL_LANGUAGES.includes(language as SupportedLanguage) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = language;
}

const storedLanguage = localStorage.getItem('uiLanguage');
const initialLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage as SupportedLanguage) ? storedLanguage! : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDirection(initialLanguage);
i18n.on('languageChanged', applyDirection);

export default i18n;
