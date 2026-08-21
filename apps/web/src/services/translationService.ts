export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  fromCache?: boolean;
}

export interface TranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult>;
}

const CACHE_STORAGE_KEY = 'saksham_translation_cache';
const MAX_CACHE_ENTRIES = 500;

class TranslationCache {
  private memoryCache: Map<string, string> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private getKey(source: string, target: string, text: string): string {
    return `${source}:${target}:${text.trim()}`;
  }

  get(source: string, target: string, text: string): string | null {
    if (!text || !text.trim()) return text;
    const key = this.getKey(source, target, text);
    return this.memoryCache.get(key) || null;
  }

  set(source: string, target: string, text: string, translated: string): void {
    if (!text || !text.trim()) return;
    const key = this.getKey(source, target, text);
    this.memoryCache.set(key, translated);

    // Limit cache size to prevent memory bloat
    if (this.memoryCache.size > MAX_CACHE_ENTRIES) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }

    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(CACHE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.memoryCache = new Map(parsed);
        }
      }
    } catch {
      // Ignore cache load errors
    }
  }

  private saveToStorage(): void {
    try {
      const entries = Array.from(this.memoryCache.entries());
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries.slice(-200)));
    } catch {
      // Ignore cache save errors
    }
  }
}

export const translationCache = new TranslationCache();

class GoogleBackendTranslationProvider implements TranslationProvider {
  private pendingRequests: Map<string, Promise<TranslationResult>> = new Map();

  async translate(text: string, sourceLang: string = 'en', targetLang: string = 'hi'): Promise<TranslationResult> {
    const trimmed = text.trim();
    if (!trimmed || sourceLang.toLowerCase() === targetLang.toLowerCase()) {
      return {
        translatedText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        provider: 'identity',
        fromCache: true
      };
    }

    // 1. Check cache first
    const cached = translationCache.get(sourceLang, targetLang, trimmed);
    if (cached !== null) {
      return {
        translatedText: cached,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        provider: 'cache',
        fromCache: true
      };
    }

    // 2. Deduplicate inflight requests for identical text
    const inflightKey = `${sourceLang}:${targetLang}:${trimmed}`;
    if (this.pendingRequests.has(inflightKey)) {
      return this.pendingRequests.get(inflightKey)!;
    }

    // 3. Perform fetch request to backend translation endpoint
    const promise = (async (): Promise<TranslationResult> => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const fetchUrl = baseUrl.endsWith('/api/v1') 
          ? `${baseUrl}/translation/translate` 
          : `${baseUrl || 'http://localhost:8000'}/api/v1/translation/translate`;
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: trimmed,
            sourceLanguage: sourceLang,
            targetLanguage: targetLang
          })
        });

        if (!response.ok) {
          throw new Error(`Translation endpoint HTTP error ${response.status}`);
        }

        const data = await response.json();
        const translatedText = data.translatedText || trimmed;

        // Cache successful response
        translationCache.set(sourceLang, targetLang, trimmed, translatedText);

        return {
          translatedText,
          sourceLanguage: data.sourceLanguage || sourceLang,
          targetLanguage: data.targetLanguage || targetLang,
          provider: data.provider || 'google-backend'
        };
      } catch (error) {
        console.warn('[TranslationService] Dynamic translation endpoint failed, using fallback:', error);
        return {
          translatedText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          provider: 'fallback-original'
        };
      } finally {
        this.pendingRequests.delete(inflightKey);
      }
    })();

    this.pendingRequests.set(inflightKey, promise);
    return promise;
  }
}

export const translationProvider: TranslationProvider = new GoogleBackendTranslationProvider();
