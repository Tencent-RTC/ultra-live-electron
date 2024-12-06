import TRTCCloud, { TRTCLogLevel } from 'trtc-electron-sdk';

const trtcCloud  = TRTCCloud.getTRTCShareInstance({
  isIPCMode: true
});
// trtcCloud.setLogLevel(TRTCLogLevel.TRTCLogLevelDebug);

export default trtcCloud;
