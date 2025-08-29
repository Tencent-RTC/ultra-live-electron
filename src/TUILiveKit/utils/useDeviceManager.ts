import trtcCloud from './trtcCloud';

const deviceManager = trtcCloud;

export default function useDeviceManager() {
  if (!deviceManager) {
    throw new Error('create device manager failed');
  }
  return deviceManager;
}
