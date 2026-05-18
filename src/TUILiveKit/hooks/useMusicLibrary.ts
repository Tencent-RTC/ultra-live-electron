/**
 * @module useMusicLibrary
 * @description Background music library management (application layer)
 *
 * Responsibilities:
 * - This module: maintain the music list, add/remove/update entries, persist to
 *   localStorage (isolated by logged-in userId)
 * - AtomicX layer `MusicState`: playback control
 *
 * Design notes:
 * - Singleton reactive `musicList` shared across multiple UI components
 * - Reload the library by userId automatically when the logged-in user changes
 * - Persist to localStorage on add/remove
 * - Items that fail deserialization on startup are filtered out without blocking recovery
 */
import { effectScope, ref, watch } from 'vue';
import { useLoginState } from 'tuikit-atomicx-vue3-electron';

const STORAGE_KEY_PREFIX = 'tuilivekit::music-library::';

/**
 * Music entry (business-layer definition, not the SDK's AudioMusicParam).
 */
export interface MusicLibItem {
  /** Business-layer UUID, used as a stable reference in the UI */
  id: string;
  /** Audio resource address: local absolute path or http(s) URL */
  url: string;
  /** Display name; falls back to the basename of `url` when not provided */
  name: string;
  /** Duration in milliseconds; 0 means unknown (network resources are usually
   *  filled in by `onPlayProgress` after the first playback) */
  durationMs: number;
  /** Added timestamp (used for default sorting and deduplication reference) */
  addedAt: number;
  /** Whether this is a network URL (for UI marking and playback differentiation) */
  isNetwork: boolean;
}

// ============================================================
// Module-level singleton state
// ============================================================

const { loginUserInfo } = useLoginState();

const musicList = ref<MusicLibItem[]>([]);
let currentUserId: string | null = null;
let lifecycleBound = false;

// ============================================================
// Utilities
// ============================================================

function getStorageKey(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function basenameFromUrl(url: string): string {
  try {
    const withoutQuery = url.split(/[?#]/)[0];
    const parts = withoutQuery.split(/[/\\]/);
    const last = parts[parts.length - 1];
    if (last && last.trim()) return decodeURIComponent(last);
  } catch (e) {
    // fallthrough
  }
  return url;
}

function isNetworkURL(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Generate a stable UUID (good enough for non-cryptographic use cases).
 */
function genId(): string {
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    try {
      return cryptoObj.randomUUID();
    } catch {
      // fallthrough
    }
  }
  // fallback
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Coarse-grained item validation: required fields are present and `url` is non-empty.
 */
function isValidItem(item: any): item is MusicLibItem {
  return (
    !!item
    && typeof item === 'object'
    && typeof item.id === 'string'
    && typeof item.url === 'string'
    && item.url.trim().length > 0
    && typeof item.name === 'string'
    && typeof item.durationMs === 'number'
    && typeof item.addedAt === 'number'
    && typeof item.isNetwork === 'boolean'
  );
}

// ============================================================
// Persistence
// ============================================================

function loadFromStorage(userId: string | null | undefined): MusicLibItem[] {
  const key = getStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidItem);
  } catch (error) {
    console.warn('[useMusicLibrary] load failed:', error);
    return [];
  }
}

function persistToStorage(userId: string | null | undefined, list: MusicLibItem[]): void {
  const key = getStorageKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    console.warn('[useMusicLibrary] persist failed:', error);
  }
}

// ============================================================
// Lifecycle: watch logged-in user changes
// ============================================================

function bindLifecycle() {
  if (lifecycleBound) return;
  lifecycleBound = true;

  // ⚠️ Use a detached effectScope so the watch lives with this singleton
  //    module instead of the calling component's scope.
  //    `useMusicLibrary()` is consumed inside `<script setup>` of MusicPanel.
  //    Without a detached scope, the watch would be auto-disposed when
  //    MusicPanel unmounts (closing the dialog). After that, switching to
  //    another logged-in user would NOT reload that user's list — the in-
  //    memory `musicList` and `currentUserId` would keep pointing to the
  //    previous user, and any subsequent `addMusic` would still persist
  //    under the previous user's localStorage key (cross-account leak).
  const scope = effectScope(true);
  scope.run(() => {
    watch(
      () => loginUserInfo.value?.userId ?? null,
      (newUserId) => {
        if (newUserId === currentUserId) return;
        currentUserId = newUserId ?? null;
        musicList.value = loadFromStorage(currentUserId);
      },
      { immediate: true },
    );
  });
}

// ============================================================
// Public API
// ============================================================

/**
 * Add a piece of music to the library.
 *
 * - Items with the same url/file path are treated as existing and the existing
 *   entry is returned (deduplication)
 * - Persisted to localStorage
 *
 * @param payload urlOrFilePath (network URL or local absolute path) plus optional name/durationMs
 * @returns The newly added (or already existing) entry
 */
function addMusic(payload: {
  urlOrFilePath: string;
  name?: string;
  durationMs?: number;
}): MusicLibItem {
  const url = (payload.urlOrFilePath ?? '').trim();
  if (!url) throw new Error('[useMusicLibrary] addMusic: urlOrFilePath is required');

  const existed = musicList.value.find((i) => i.url === url);
  if (existed) return existed;

  const item: MusicLibItem = {
    id: genId(),
    url,
    name: (payload.name ?? '').trim() || basenameFromUrl(url),
    durationMs: typeof payload.durationMs === 'number' && payload.durationMs > 0 ? payload.durationMs : 0,
    addedAt: Date.now(),
    isNetwork: isNetworkURL(url),
  };
  musicList.value = [...musicList.value, item];
  persistToStorage(currentUserId, musicList.value);
  return item;
}

/**
 * Remove a track by id.
 */
function removeMusic(id: string): void {
  if (!id) return;
  const next = musicList.value.filter((i) => i.id !== id);
  if (next.length === musicList.value.length) return;
  musicList.value = next;
  persistToStorage(currentUserId, musicList.value);
}

/**
 * Clear the entire library.
 */
function clearMusicList(): void {
  if (musicList.value.length === 0) return;
  musicList.value = [];
  persistToStorage(currentUserId, musicList.value);
}

/**
 * Find a track by id.
 */
function findMusicById(id: string): MusicLibItem | null {
  return musicList.value.find((i) => i.id === id) ?? null;
}

/**
 * Find a track by url.
 */
function findMusicByUrl(url: string): MusicLibItem | null {
  if (!url) return null;
  return musicList.value.find((i) => i.url === url) ?? null;
}

/**
 * Update track metadata (e.g. backfilling durationMs).
 */
function updateMusic(id: string, patch: Partial<Pick<MusicLibItem, 'name' | 'durationMs'>>): void {
  const idx = musicList.value.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const next = [...musicList.value];
  next[idx] = { ...next[idx], ...patch };
  musicList.value = next;
  persistToStorage(currentUserId, musicList.value);
}

// ============================================================
// Public hook
// ============================================================

export interface UseMusicLibraryReturn {
  /** Reactive music list (in insertion order) */
  musicList: typeof musicList;
  /** Add a piece of music */
  addMusic: typeof addMusic;
  /** Remove by id */
  removeMusic: typeof removeMusic;
  /** Clear the library */
  clearMusicList: typeof clearMusicList;
  /** Find by id */
  findMusicById: typeof findMusicById;
  /** Find by url */
  findMusicByUrl: typeof findMusicByUrl;
  /** Update entry metadata */
  updateMusic: typeof updateMusic;
}

export function useMusicLibrary(): UseMusicLibraryReturn {
  bindLifecycle();
  return {
    musicList,
    addMusic,
    removeMusic,
    clearMusicList,
    findMusicById,
    findMusicByUrl,
    updateMusic,
  };
}

export default useMusicLibrary;
