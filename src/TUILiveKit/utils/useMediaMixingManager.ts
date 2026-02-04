import { TRTCMediaMixingManager, Rect, TRTCVideoRotation, TRTCMediaMixingEvent } from 'trtc-electron-sdk';
import trtcCloud from './trtcCloud';
import { onError } from '../hooks/useMediaMixingErrorHandler';

const mediaMixingManager: TRTCMediaMixingManager | null = trtcCloud.getMediaMixingManager();

mediaMixingManager?.on(TRTCMediaMixingEvent.onError, onError);

export default function useMediaMixingManager() {
  if (!mediaMixingManager) {
    throw new Error('create media mixing manager failed');
  }
  return mediaMixingManager;
}

export function fitMediaSourceToResolution(rect: Rect, resWidth: number, resHeight: number): Rect {
  // Reduce the display size of the media source to ensure that it does not exceed the video resolution size.
  const newRect = { ...rect };
  const width = newRect.right - newRect.left;
  const height = newRect.bottom - newRect.top;
  if (width > resWidth || height > resHeight) {
    const shrinkRate = width * resHeight > height * resWidth ? resWidth/width : resHeight/height;
    newRect.right = Math.round(width * shrinkRate);
    newRect.bottom = Math.round(height * shrinkRate);
  }

  return newRect;
}

export function fitMediaSourceToOldRect(
  mediaInfo: {
    rect: Rect;
    rotation?: TRTCVideoRotation;
  },
  newSize: {width: number, height: number}
): Rect {
  const oldRect = mediaInfo.rect;
  const rotation = mediaInfo.rotation || TRTCVideoRotation.TRTCVideoRotation0;

  const newRect = { ...oldRect };
  const newWidth = newSize.width;
  const newHeight = newSize.height;
  let oldWidth = oldRect.right - oldRect.left;
  let oldHeight = oldRect.bottom - oldRect.top;
  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    const temp = oldWidth;
    oldWidth = oldHeight;
    oldHeight = temp;
  }

  const shrinkRate = oldWidth*newHeight > newWidth*oldHeight ?
    oldHeight / newHeight :
    oldWidth / newWidth;
  let fillWidth = 0;
  let fillHeight = 0;
  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    fillWidth = Math.round(newHeight * shrinkRate);
    fillHeight = Math.round(newWidth * shrinkRate);
  } else {
    fillWidth = Math.round(newWidth * shrinkRate);
    fillHeight = Math.round(newHeight * shrinkRate);
  }
  newRect.right = oldRect.left + fillWidth;
  newRect.bottom = oldRect.top + fillHeight;
  return newRect;
}

export function fitMediaSourceToNewSize(
  mediaInfo: {
    rect: Rect;
    rotation?: TRTCVideoRotation;
  },
  newMediaSize: {width: number; height: number}
): Rect {
  const oldRect = mediaInfo.rect;
  const rotation = mediaInfo.rotation || TRTCVideoRotation.TRTCVideoRotation0;
  let realRect = oldRect;
  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    realRect = rotateRect(oldRect, rotation);
  }

  realRect = adjustMediaSourceToNewSize(realRect, newMediaSize);

  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    realRect = rotateRect(realRect, rotation);
  }

  return realRect;
}

function rotateRect(rect: Rect, rotation = TRTCVideoRotation.TRTCVideoRotation0): Rect {
  if (rotation === TRTCVideoRotation.TRTCVideoRotation90 ||
      rotation === TRTCVideoRotation.TRTCVideoRotation270) {
    const halfWidth = (rect.right - rect.left) / 2;
    const halfHeight = (rect.bottom - rect.top) / 2;

    const midX = rect.left + halfWidth;
    const midY = rect.top + halfHeight;

    return {
      left: midX - halfHeight,
      top: midY - halfWidth,
      right: midX + halfHeight,
      bottom: midY + halfWidth,
    }
  } else {
    return rect;
  }
}

function adjustMediaSourceToNewSize(
  oldRect: Rect,
  newSize: {width: number; height: number}
): Rect {
  const newWidth = newSize.width;
  const newHeight = newSize.height;
  const oldWidth = oldRect.right - oldRect.left;
  const oldHeight = oldRect.bottom - oldRect.top;

  if ((oldWidth < oldHeight && newWidth < newHeight)    // portrait to portrait
    || (oldWidth > oldHeight && newWidth > newHeight)   // landscale to landscale
  ) {
    const shrinkRate = oldWidth*newHeight > newWidth*oldHeight ? oldHeight/newHeight : oldWidth/newWidth;
    const fillWidth = Math.round(newWidth * shrinkRate);
    const fillHeight = Math.round(newHeight * shrinkRate);

    const newRect = {
      left: oldRect.left + Math.round((oldWidth - fillWidth)/2),
      top: oldRect.top + Math.round((oldHeight - fillHeight)/2),
      right: 0,
      bottom: 0,
    };
    newRect.right = newRect.left + fillWidth;
    newRect.bottom = newRect.top + fillHeight;
    return newRect;
  } else {
    // portrait to landscale or landscale to portrait
    const fillWidth = oldWidth; // perfect for phone, also useful for window sharing but not very perfect
    const shrinkRate = oldWidth / newWidth;
    const fillHeight = Math.round(newHeight * shrinkRate);

    const newRect = {
      left: oldRect.left,
      right: oldRect.left + fillWidth,
      top: oldRect.top + Math.round((oldHeight - fillHeight)/2),
      bottom: 0
    };
    newRect.bottom = newRect.top + fillHeight;
    return newRect;
  }
}
