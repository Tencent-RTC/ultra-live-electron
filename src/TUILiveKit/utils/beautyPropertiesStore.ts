/**
 * Main-window singleton cache of per-camera beauty effect properties.
 *
 * This is the authoritative record of "which beauty effects are applied to
 * which camera" for the main window. It is intentionally a module-level
 * singleton (not component state) so that any part of the main-window UI can
 * read or mutate it. Two places need the SAME map:
 *   - `LiveScenePanel/index.vue`: owns the IPC sync with the child beauty
 *     dialog (BEAUTY_UPDATE overwrite, camera-switch migration, edit-mode
 *     effectConstant back-fill).
 *   - `LiveScenePanel/MaterialItem.vue`: owns the camera-removal path and must
 *     drop the entry so that re-adding the same deviceId starts from a clean
 *     state instead of resurrecting the previous camera's effects.
 *
 * It holds plain JS data only (never rendered), so a raw Map is used rather
 * than a reactive structure. The mirror native plugin state is managed
 * separately by `useVideoEffectManager` (also a singleton, keyed by the same
 * camera deviceId).
 */
const beautyPropertiesMap = new Map<string, unknown[]>();

/**
 * Per-camera selected beautyTemplate identity (its stable labelKey/key).
 *
 * Kept in a parallel map alongside `beautyPropertiesMap` — NOT folded into the
 * property list — because the property list only carries native effect params
 * (effKey/effValue/resPath), which lose the template's identity once the user
 * tweaks the expanded intensity sliders. Persisting the picked tile's key lets
 * edit-mode back-fill restore the highlight by identity instead of reverse-
 * matching drifted effValues. Every lifecycle mutation of `beautyPropertiesMap`
 * (delete / clear / migrate) must mirror onto this map to avoid stale keys.
 */
const selectedTemplateKeyMap = new Map<string, string>();

/** Read the cached properties for a camera (undefined when none applied). */
export function getBeautyProperties(cameraId: string): unknown[] | undefined {
  return beautyPropertiesMap.get(cameraId);
}

/**
 * List every cameraId that currently has cached beauty properties.
 *
 * Used by the mixing-server crash recovery path to know which cameras need
 * their beauty effect re-applied after the native side is rebuilt. Returns a
 * snapshot array so callers can safely iterate while mutating the map.
 */
export function getBeautyPropertyCameraIds(): string[] {
  return Array.from(beautyPropertiesMap.keys());
}

/** Overwrite the cached properties for a camera. */
export function setBeautyProperties(cameraId: string, properties: unknown[]): void {
  beautyPropertiesMap.set(cameraId, properties);
}

/** Read the cached selected beautyTemplate key for a camera (undefined when none). */
export function getSelectedTemplateKey(cameraId: string): string | undefined {
  return selectedTemplateKeyMap.get(cameraId);
}

/**
 * Store (or clear, when the key is falsy) the selected beautyTemplate key for a
 * camera. A null/empty key means "no template selected" and drops the entry so
 * a subsequent edit-mode open does not resurrect a stale highlight.
 */
export function setSelectedTemplateKey(cameraId: string, key: string | null | undefined): void {
  if (key) {
    selectedTemplateKeyMap.set(cameraId, key);
  } else {
    selectedTemplateKeyMap.delete(cameraId);
  }
}

/** Drop the cached properties for a camera (no-op when absent). */
export function deleteBeautyProperties(cameraId: string): void {
  beautyPropertiesMap.delete(cameraId);
  selectedTemplateKeyMap.delete(cameraId);
}

/**
 * Drop every cached entry. Used on logout so a subsequent login (possibly a
 * different user) starts from a clean state and never resurrects the previous
 * session's beauty config when the same deviceId camera is re-added.
 */
export function clearAllBeautyProperties(): void {
  beautyPropertiesMap.clear();
  selectedTemplateKeyMap.clear();
}

/**
 * Move the cached entry from one cameraId to another and return the moved
 * properties (or undefined when the source had none). Used on camera deviceId
 * switch so the beauty config follows the user to the newly selected device.
 */
export function migrateBeautyProperties(oldId: string, newId: string): unknown[] | undefined {
  const props = beautyPropertiesMap.get(oldId);
  beautyPropertiesMap.delete(oldId);
  if (props && props.length > 0) {
    beautyPropertiesMap.set(newId, props);
  }
  // Move the selected-template identity in lock-step so the highlight follows
  // the beauty config to the newly selected device.
  const templateKey = selectedTemplateKeyMap.get(oldId);
  selectedTemplateKeyMap.delete(oldId);
  if (props && props.length > 0 && templateKey) {
    selectedTemplateKeyMap.set(newId, templateKey);
  }
  return props;
}

export default beautyPropertiesMap;
