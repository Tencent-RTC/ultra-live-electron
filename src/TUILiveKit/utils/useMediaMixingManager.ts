import { TRTCMediaMixingManager } from 'trtc-electron-sdk';
import trtcCloud from "./trtcCloud";

const mediaMixingManager: TRTCMediaMixingManager | null = trtcCloud.getMediaMixingManager();

export default function useMediaMixingManager() {
  if (!mediaMixingManager) {
    throw new Error("create media mixing manager failed");
  }
  return mediaMixingManager;
}
