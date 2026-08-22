export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  flagIcon?: string;
  supported: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', supported: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', supported: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', supported: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr', supported: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', supported: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', supported: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr', supported: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr', supported: false },
];

export const getLanguageOption = (code: string): LanguageOption => {
  const normalized = code.toLowerCase().split('-')[0];
  return (
    SUPPORTED_LANGUAGES.find(l => l.code === normalized) || {
      code: normalized,
      name: normalized.toUpperCase(),
      nativeName: normalized.toUpperCase(),
      dir: 'ltr',
      supported: true
    }
  );
};
