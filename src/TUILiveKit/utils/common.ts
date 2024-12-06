import { getUrlParam } from './envUtils';

export function getLanguage() {
  let language = getUrlParam('lang') || navigator.language || 'zh';
  language = language.replace(/_/, '-').toLowerCase();

  if (language === 'zh-cn' || language === 'zh') {
    language = 'zh-CN';
  } else {
    language = 'en-US';
  }
  return language;
}