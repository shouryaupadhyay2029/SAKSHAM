import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translationProvider, translationCache } from '../services/translationService';

export interface UseDynamicTranslationResult {
  translatedText: string;
  isLoading: boolean;
  isTranslated: boolean;
  provider: string;
}

export function useDynamicTranslation(
  text: string | undefined | null,
  sourceLang: string = 'en'
): UseDynamicTranslationResult {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const targetLang = currentLang.split('-')[0].toLowerCase();
  const safeText = text || '';

  // Check cache synchronously for instant initial render
  const cachedSync = translationCache.get(sourceLang, targetLang, safeText);

  const [translatedText, setTranslatedText] = useState<string>(cachedSync ?? safeText);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedSync && safeText.trim() !== '' && sourceLang !== targetLang);
  const [provider, setProvider] = useState<string>(cachedSync ? 'cache' : 'initial');

  useEffect(() => {
    let isSubscribed = true;

    if (!safeText || !safeText.trim() || sourceLang.toLowerCase() === targetLang) {
      setTranslatedText(safeText);
      setIsLoading(false);
      setProvider('identity');
      return;
    }

    const cached = translationCache.get(sourceLang, targetLang, safeText);
    if (cached !== null) {
      setTranslatedText(cached);
      setIsLoading(false);
      setProvider('cache');
      return;
    }

    setIsLoading(true);
    translationProvider
      .translate(safeText, sourceLang, targetLang)
      .then(res => {
        if (isSubscribed) {
          setTranslatedText(res.translatedText);
          setProvider(res.provider);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isSubscribed) {
          console.warn('[useDynamicTranslation] Error translating text:', err);
          setTranslatedText(safeText);
          setIsLoading(false);
          setProvider('error-fallback');
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [safeText, sourceLang, targetLang]);

  return {
    translatedText,
    isLoading,
    isTranslated: targetLang !== sourceLang && translatedText !== safeText,
    provider
  };
}
