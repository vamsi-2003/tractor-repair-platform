import { en, type TranslationKey, type TranslationsType } from './en';
import { te } from './te';
import { hi } from './hi';
import { kn } from './kn';
import { ta } from './ta';

export type Language = 'en' | 'te' | 'hi' | 'kn' | 'ta';

export const translations: Record<Language, TranslationsType> = {
  en,
  te,
  hi,
  kn,
  ta,
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
export * from './kn';
export * from './ta';
