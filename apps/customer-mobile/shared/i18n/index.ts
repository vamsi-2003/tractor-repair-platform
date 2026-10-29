import { en, type TranslationKey, type TranslationsType } from './en';
import { te } from './te';
import { hi } from './hi';

export type Language = 'en' | 'te' | 'hi';

export const translations: Record<Language, TranslationsType> = {
  en,
  te,
  hi,
};

/**
 * Translate a key into the specified language with English fallback.
 */
export function t(key: TranslationKey, language: Language = 'en'): string {
  const langDict = translations[language] || translations.en;
  return langDict[key] ?? translations.en[key] ?? key;
}

export * from './en';
export * from './te';
export * from './hi';
