export function getSpeakerTestUrl(): string {
  const appPath = (window as Window & { APP_PATH?: string }).APP_PATH;
  const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (appPath) {
    return isProduction ? `${appPath}/dist/TestSpeaker.mp3` : `${appPath}/public/TestSpeaker.mp3`;
  }
  return '/TestSpeaker.mp3';
}
