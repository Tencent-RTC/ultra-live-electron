const PROFILE_FIELDS = new Set(['name', 'avatar', 'userName', 'avatarUrl']);

export const USER_INFO_STORAGE_KEY = 'TUILiveKit-userInfo';

export function stripProfileFields<T extends Record<string, unknown>>(userInfo?: T | null): Omit<T, 'name' | 'avatar' | 'userName' | 'avatarUrl'> {
  if (!userInfo) {
    return {} as Omit<T, 'name' | 'avatar' | 'userName' | 'avatarUrl'>;
  }

  const authInfo: Record<string, unknown> = {};
  Object.keys(userInfo).forEach((key) => {
    if (PROFILE_FIELDS.has(key)) {
      return;
    }
    authInfo[key] = userInfo[key];
  });

  return authInfo as Omit<T, 'name' | 'avatar' | 'userName' | 'avatarUrl'>;
}
