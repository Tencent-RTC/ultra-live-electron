import useVideoEffectManager from './useVideoEffectManager';
import { clearAllBeautyProperties } from './beautyPropertiesStore';
import logger from './logger';

const logPrefix = '[beautyLogoutCleanup]';

/**
 * Release all beauty resources when the user logs out.
 *
 * Kept intentionally lightweight so the logout interaction stays snappy: we do
 * NOT walk the media-source list to remove each camera source (that path incurs
 * a per-camera clean-flush delay plus removeMediaSource round-trips). Instead we
 * simply drop every native beauty plugin and clear the cached per-camera beauty
 * properties.
 *
 * The actual fix for beauty silently failing after re-login lives in
 * `videoEffectManager.resetForRelogin()`: init()'s global
 * `setPluginParams(TRTCPluginTypeVideoProcess)` pipeline switch is
 * `inited`-guarded and only runs once per app lifetime, but logout tears down
 * that liteav pipeline config. resetForRelogin() clears leftover plugins AND
 * flips `inited` back to false so the next session's first startEffect re-runs
 * init() and re-applies the pipeline, routing captured frames into the plugin
 * again.
 *
 * Best-effort: failures are caught and never block logout.
 */
export function releaseBeautyResourcesOnLogout(): void {
  try {
    const videoEffectManager = useVideoEffectManager();
    // Remove every native plugin and force init() to re-run next session.
    videoEffectManager.resetForRelogin();
    // Drop cached per-camera beauty properties so a re-login starts clean.
    clearAllBeautyProperties();
    logger.log(`${logPrefix} beauty resources released on logout`);
  } catch (error) {
    logger.warn(`${logPrefix} release beauty resources on logout failed`, error);
  }
}
