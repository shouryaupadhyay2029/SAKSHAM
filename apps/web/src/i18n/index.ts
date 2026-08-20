import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from './locales/en/translation.json';
import translationHI from './locales/hi/translation.json';

// Detect browser fallback or local preference
const getInitialLanguage = (): string => {
  const saved = localStorage.getItem('saksham_language');
  if (saved && (saved === 'en' || saved === 'hi')) {
    return saved;
  }
  
  // Browser language detection
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  if (browserLang.toLowerCase().startsWith('hi')) {
    return 'hi';
  }
  
  return 'en';
};

const resources = {
  en: {
    translation: translationEN,
  },
  hi: {
    translation: translationHI,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
    },
  });

// Automatically sync change language state to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('saksham_language', lng);
});

export default i18n;
