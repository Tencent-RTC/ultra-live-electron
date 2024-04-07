import TUIRoomEngine from '@tencentcloud/tuiroom-engine-electron';
const roomEngine: Record<string, TUIRoomEngine | null> = { instance: null };
export default function useGetRoomEngine() {
  return roomEngine;
}

TUIRoomEngine.once('ready', () => {
  roomEngine.instance = new TUIRoomEngine();
  const trtcCloud = roomEngine.instance.getTRTCCloud();
  trtcCloud.callExperimentalAPI(JSON.stringify({
    api: 'setFramework',
    params: {
      framework: 2, // electron
      component: 21, // TUILiveKit
      language: 6, // vue3
    },
  }));
});