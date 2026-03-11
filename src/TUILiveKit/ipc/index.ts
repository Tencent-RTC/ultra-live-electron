/**
 * IPC Module Entry
 * Unified export for inter-window communication
 */

// Export all types
export {
  WindowType,
  MessageTarget,
  IPCMessageType,
  IPCMessage,
  IPCMessageHandler,
  SetCurrentDevicePayload,
  CameraTestPayload,
  HandleUserApplyPayload,
  DeviceVolumePayload,
  MicTestPayload,
  ChildPanelType,
  ShowChildPanelPayload,
  UpdateChildDataPayload,
  LiveSettingActionType,
  ApplyLiveSettingPayload,
  LiveTitleSettingInitialData,
  ApplyLiveTitlePayload,
  ConfirmDialogScene,
  ConfirmDialogSceneLike,
  ConfirmDialogActionPayload,
  ShowConfirmDialogPayload,
  CloseConfirmDialogPayload,
  MainProcessAction,
} from './types';

// Export IPCBridge class and singleton instance
export { IPCBridge, ipcBridge } from './IPCBridge';

// Utility: convert payload to plain JSON-serializable object for IPC
// NOTE: Only use this for JSON-friendly data structures (no functions / Symbols / BigInt)
export function toPlainIpcPayload<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload)) as T;
}

// Export main window message handler (will be implemented in Phase 2+)
// export { MainWindowMessageHandler } from './MainWindowMessageHandler';
