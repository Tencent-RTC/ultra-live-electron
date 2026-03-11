export const WINDOW_TITLE_PREFIX = 'tuilivekit-electron';
export const DEFAULT_WINDOW_TITLE = WINDOW_TITLE_PREFIX;
export const STABLE_TITLE_WINDOW_TYPES = ['main', 'child', 'confirm', 'cover'] as const;

type StableWindowType = typeof STABLE_TITLE_WINDOW_TYPES[number];

export const APP_WINDOW_TITLE_PREFIXES = STABLE_TITLE_WINDOW_TYPES.map(
  (windowType) => `${WINDOW_TITLE_PREFIX}-${windowType}`
);

function isStableWindowType(windowType: string): windowType is StableWindowType {
  return (STABLE_TITLE_WINDOW_TYPES as readonly string[]).includes(windowType);
}

function buildStableWindowTitle(windowType: StableWindowType, appVersion: string): string {
  return `${WINDOW_TITLE_PREFIX}-${windowType}[${appVersion}]`;
}

function buildFallbackWindowTitle(appVersion: string): string {
  return `${DEFAULT_WINDOW_TITLE}[${appVersion}]`;
}

export async function setStableWindowTitle(appVersion: string): Promise<void> {
  let targetTitle = buildFallbackWindowTitle(appVersion);

  try {
    const windowType = await window.ipcRenderer.invoke('window-type');
    if (typeof windowType === 'string' && isStableWindowType(windowType)) {
      targetTitle = buildStableWindowTitle(windowType, appVersion);
    }
  } catch (error) {
    console.warn('[windowTitle] setStableWindowTitle failed:', error);
  }

  window.document.title = targetTitle;
}
