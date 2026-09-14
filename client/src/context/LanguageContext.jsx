import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations';

const STORAGE_KEY = 'hitpop_language';

const LanguageContext = createContext({
  language: 'es',
  setLanguage: () => {},
  t: (path, fallback) => fallback || path,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) return saved;

      // Auto-detect browser language
      const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
      if (translations[browserLang]) return browserLang;
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'es';
  });

  const setLanguage = useCallback((newLang) => {
    if (!translations[newLang]) return;
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Could not save language preference:', e);
    }
  }, []);

  // Update HTML lang attribute whenever language changes
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Translate helper: t('landing.subtitle', 'Fallback text')
  const t = useCallback((path, fallback = '') => {
    if (!path) return fallback;
    const parts = path.split('.');

    let current = translations[language];
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }

    if (typeof current === 'string') return current;

    // Fallback to Spanish
    let fallbackCur = translations['es'];
    for (const part of parts) {
      if (fallbackCur && typeof fallbackCur === 'object' && part in fallbackCur) {
        fallbackCur = fallbackCur[part];
      } else {
        fallbackCur = null;
        break;
      }
    }

    if (typeof fallbackCur === 'string') return fallbackCur;
    return fallback || path;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export const useLanguage = useTranslation;
