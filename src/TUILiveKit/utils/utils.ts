export function safelyParse(data: string) {
  if (typeof data !== 'string') {
    return data;
  }
  let result;
  try {
    const tempData = JSON.parse(data);
    if (typeof tempData === 'object' && tempData) {
      result = tempData;
    } else {
      result = data;
    }
  } catch (error) {
    result = data;
  }
  return result;
}

export function changeTheme(windowElement: Element|null, theme: string) {
  if (windowElement == null) return;
  const ThemeList = Object.values(ThemeColor);
  ThemeList.forEach(theme => {
    if(windowElement?.classList.value.includes(theme)){
      windowElement ?.classList.remove(theme);
    }
  })
  windowElement ?.classList.add(theme);
}

export enum ThemeColor {
  DarkTheme = 'dark-theme',
  LightTheme = 'light-theme'
}

export function generateUniqueId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export const debounce = <F extends (...args: any[]) => void>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function isNetworkOffline(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return navigator.onLine === false;
}

export function isNetworkTimeoutError(error: any): boolean {
  if (!error) {
    return false;
  }
  const message = String(error.message || error.errorMessage || '');
  if (message.includes('NETWORK_TIMEOUT') || message.includes('Network error')) {
    return true;
  }
  return false;
}

const utf8Encoder = new TextEncoder();

export function getUtf8ByteLength(value: string): number {
  if (!value) {
    return 0;
  }
  return utf8Encoder.encode(value).length;
}

export function trimToUtf8ByteLength(value: string, maxBytes: number): string {
  if (!value || maxBytes <= 0) {
    return '';
  }
  if (getUtf8ByteLength(value) <= maxBytes) {
    return value;
  }
  let bytes = 0;
  let endIndex = 0;
  for (const char of value) {
    const nextBytes = utf8Encoder.encode(char).length;
    if (bytes + nextBytes > maxBytes) {
      break;
    }
    bytes += nextBytes;
    endIndex += char.length;
  }
  return value.slice(0, endIndex);
}

export function isSvgCoverUrl(coverUrl: string): boolean {
  if (!coverUrl) {
    return false;
  }
  const normalizedUrl = coverUrl.trim().toLowerCase();
  if (!normalizedUrl) {
    return false;
  }
  if (normalizedUrl.startsWith('data:image/svg+xml')) {
    return true;
  }
  const urlWithoutQuery = normalizedUrl.split('#')[0].split('?')[0];
  return urlWithoutQuery.endsWith('.svg') || urlWithoutQuery.endsWith('.svgz');
}
