import { getUrlParam } from './envUtils';

/**
 * 获取语言
 * @returns language
 */
export function getLanguage() {
  let language = getUrlParam('lang') || localStorage.getItem('TUILiveKit-language') || navigator.language || 'zh';
  language = language.replace(/_/, '-').toLowerCase();

  if (language === 'zh-cn' || language === 'zh') {
    language = 'zh-CN';
  } else if (language === 'en' || language === 'en-us' || language === 'en-GB') {
    language = 'en-US';
  }
  return language;
}