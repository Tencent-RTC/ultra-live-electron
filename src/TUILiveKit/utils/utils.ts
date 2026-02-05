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


