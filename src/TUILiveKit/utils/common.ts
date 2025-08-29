import { getUrlParam } from './envUtils';

export function getLanguage(): string {
  let language = getUrlParam('lang') || navigator.language || 'zh';
  language = language.replace(/_/, '-').toLowerCase();

  if (language === 'zh-cn' || language === 'zh') {
    language = 'zh-CN';
  } else {
    language = 'en-US';
  }
  return language;
}

export const defaultAvatarURL =  'https://imgcache.qq.com/qcloud/public/static/avatar8_100.20191230.png';
