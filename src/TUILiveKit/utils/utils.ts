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