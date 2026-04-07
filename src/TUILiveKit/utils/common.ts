import { getUrlParam } from './envUtils';

export const SUPPORTED_LANGUAGES = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export function normalizeLanguage(rawLanguage: string): SupportedLanguage {
  const language = rawLanguage.replace(/_/g, '-').toLowerCase();

  if (language === 'zh-tw' || language === 'zh-hk' || language.indexOf('hant') !== -1) {
    return 'zh-TW';
  }
  if (language === 'zh-cn' || language === 'zh' || language.indexOf('hans') !== -1 || language.startsWith('zh-')) {
    return 'zh-CN';
  }
  if (language.startsWith('ja')) {
    return 'ja-JP';
  }
  if (language.startsWith('ko')) {
    return 'ko-KR';
  }
  if (language.startsWith('en')) {
    return 'en-US';
  }
  return 'en-US';
}

export function mapToRoomEngineLanguage(language: string): string {
  const normalizedLanguage = normalizeLanguage(language);
  if (normalizedLanguage === 'zh-CN') {
    return 'zh-Hans';
  }
  if (normalizedLanguage === 'zh-TW') {
    return 'zh-Hant';
  }
  // if (normalizedLanguage === 'ja-JP') {
  //   return 'ja';
  // }
  // if (normalizedLanguage === 'ko-KR') {
  //   return 'ko';
  // }
  return 'en';
}

export function isChineseLanguage(language: string): boolean {
  const normalizedLanguage = normalizeLanguage(language);
  return normalizedLanguage === 'zh-CN' || normalizedLanguage === 'zh-TW';
}

export function getLanguage(): string {
  const language = getUrlParam('lang') || navigator.language || 'zh';
  return normalizeLanguage(language);
}
