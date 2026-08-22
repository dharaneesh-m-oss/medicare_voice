/**
 * TRANSLATION MODULE.
 *
 * Adding a language = add a bundle file + one row in LANGUAGES. No component,
 * engine or screen needs to change, and untranslated keys fall back to English
 * one key at a time (never a blank screen).
 */

import type { LanguageCode } from '../types';
import { en, type TranslationBundle, type TranslationKey } from './en';
import { hi } from './hi';
import { ta } from './ta';

export interface LanguageDefinition {
  code: LanguageCode;
  /** Name written in the language itself — elderly users look for this. */
  nativeName: string;
  englishName: string;
  /** BCP-47 tag for speech recognition and text-to-speech. */
  locale: string;
  bundle: TranslationBundle;
}

export const LANGUAGES: LanguageDefinition[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', locale: 'en-IN', bundle: en },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', locale: 'ta-IN', bundle: ta },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN', bundle: hi },
];

export function getLanguage(code: LanguageCode): LanguageDefinition {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function localeFor(code: LanguageCode): string {
  return getLanguage(code).locale;
}

export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** Translate one key. Falls back: chosen language -> English -> the key itself. */
export function translate(
  code: LanguageCode,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const bundle = getLanguage(code).bundle;
  const template = bundle[key] ?? en[key] ?? key;
  return interpolate(template, params);
}

/** Bind a translator to one language (what the UI hook hands to components). */
export function createTranslator(code: LanguageCode) {
  return (key: TranslationKey, params?: TranslateParams) => translate(code, key, params);
}

export type Translator = ReturnType<typeof createTranslator>;
export type { TranslationKey, TranslationBundle };
export { en };
