import { TRTCMediaSourceType } from '@tencentcloud/tuiroom-engine-electron';
import { useVideoMixerState } from 'tuikit-atomicx-vue3-electron';
import logger from './logger';

const logPrefix = '[appQuitCleanup]';

/**
 * Release the native camera BEFORE the app quits so the camera LED turns off
 * immediately instead of lingering a few seconds.
 *
 * Root cause: `trtcCloud` is created with `isIPCMode: true`, so the camera is
 * opened and held by the native TRTC engine running in a separate subprocess.
 * The quit flow only closes the Electron windows and then hard-exits the main
 * process (`process.exit(0)` in `main.js` `quitApplication`).
 *
 * Why NOT `destroyTRTCShareInstance()`: in IPC mode it only tears down the
 * JS-side proxy and defers the actual device release to the subprocess
 * teardown, which the OS reclaims a few seconds later — so the LED stayed lit.
 *
 * The reliable path (verified in the UI via the "delete camera" action) is
 * `mediaMixingManager.removeMediaSource(cameraSource)`: it explicitly tells
 * liteav to stop capturing that camera and release the device right away, so
 * the LED goes off almost instantly. That removal is exactly what
 * `useVideoMixerState().removeMediaSource` performs, so we reuse it here.
 *
 * IMPORTANT: callers MUST `await` this BEFORE sending `app-quit-confirmed` to
 * the main process. Once the main process receives that signal it closes all
 * windows and hard-exits, killing this renderer before any late teardown could
 * run.
 */
export async function releaseMediaResourcesBeforeQuit(): Promise<void> {
  try {
    const { mediaSourceList, removeMediaSource } = useVideoMixerState();
    const cameraSources = (mediaSourceList.value || []).filter(
      (source) => source.sourceType === TRTCMediaSourceType.kCamera,
    );
    if (cameraSources.length === 0) {
      return;
    }
    logger.log(`${logPrefix} removing ${cameraSources.length} camera source(s) to release the device before quit`);
    // Await so the native stop-capture ack returns (and the device is released)
    // before the main process hard-exits.
    await Promise.all(cameraSources.map((source) => removeMediaSource(source)));
  } catch (error) {
    logger.warn(`${logPrefix} release media resources before quit failed`, error);
  }
}
