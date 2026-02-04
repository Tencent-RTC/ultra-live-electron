export function isMacPlatform() {
  if (typeof navigator === 'undefined' || typeof navigator.userAgent !== 'string') {
    return false;
  }
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('macintosh') || userAgent.includes('mac os x');
}


