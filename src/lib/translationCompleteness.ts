/**
 * Translation completeness tracking utility
 *
 * Defines the translation status for each language and namespace.
 * Community contributors can update this file to reflect completion progress.
 */

export type TranslationStatus = 'complete' | 'partial' | 'incomplete';

type LanguageMetadata = {
  native: string;
  status: TranslationStatus;
  note?: string;
};

export const LANGUAGES_METADATA: Record<string, LanguageMetadata> = {
  en: { native: 'English', status: 'complete' },
  es: { native: 'Español', status: 'complete' },
  fr: { native: 'Français', status: 'complete' },
  de: { native: 'Deutsch', status: 'complete' },
  pt: { native: 'Português', status: 'complete' },
  ja: { native: '日本語', status: 'complete' },
  ko: { native: '한국어', status: 'complete' },
  'zh-CN': { native: '中文（简体）', status: 'complete' },
  ar: { native: 'العربية', status: 'complete' },
  hi: { native: 'हिन्दी', status: 'complete' },
  // Newly added languages (community translations welcome)
  it: { native: 'Italiano', status: 'partial', note: 'Partial (common.json only)' },
  nl: { native: 'Nederlands', status: 'partial', note: 'Partial (common.json only)' },
  ru: { native: 'Русский', status: 'partial', note: 'Partial (common.json only)' },
  pl: { native: 'Polski', status: 'partial', note: 'Partial (common.json only)' },
  tr: { native: 'Türkçe', status: 'partial', note: 'Partial (common.json only)' },
  th: { native: 'ไทย', status: 'partial', note: 'Partial (common.json only)' },
  vi: { native: 'Tiếng Việt', status: 'partial', note: 'Partial (common.json only)' },
  id: { native: 'Bahasa Indonesia', status: 'partial', note: 'Partial (common.json only)' },
  sv: { native: 'Svenska', status: 'partial', note: 'Partial (common.json only)' },
  nb: { native: 'Norsk', status: 'partial', note: 'Partial (common.json only)' },
};

export const TRANSLATION_NAMESPACES = [
  'admin',
  'auth',
  'coaching',
  'common',
  'dashboard',
] as const;

export type LanguageCode = keyof typeof LANGUAGES_METADATA;

export function getLanguageStatus(lang: LanguageCode): TranslationStatus {
  return LANGUAGES_METADATA[lang]?.status ?? 'incomplete';
}

export function getLanguageNative(lang: LanguageCode): string {
  return LANGUAGES_METADATA[lang]?.native ?? lang;
}

export function getCompletionStats() {
  const complete = Object.values(LANGUAGES_METADATA).filter((l) => l.status === 'complete').length;
  const partial = Object.values(LANGUAGES_METADATA).filter((l) => l.status === 'partial').length;
  const incomplete = Object.values(LANGUAGES_METADATA).filter((l) => l.status === 'incomplete').length;
  const total = Object.keys(LANGUAGES_METADATA).length;

  return { complete, partial, incomplete, total };
}

export const TRANSLATION_STATUS_COLORS = {
  complete: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  incomplete: 'bg-gray-100 text-gray-800',
} as const;
