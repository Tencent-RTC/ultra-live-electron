/**
 * IPC Message Types and Interfaces
 * This module defines all message types for inter-window communication
 */
import { MusicPlayStatus } from 'tuikit-atomicx-vue3-electron';

/**
 * Window type enumeration
 */
export type WindowType = 'main' | 'child' | 'cover' | 'confirm';

/**
 * Broadcast target type
 */
export type MessageTarget = WindowType | 'broadcast' | 'electron-main';

/**
 * IPC Message type enumeration
 * Categorized by functionality
 */
export enum IPCMessageType {
  ADD_CAMERA = 'addCamera',
  UPDATE_CAMERA = 'updateCamera',
  ADD_SCREEN_SHARE = 'addScreenShare',
  UPDATE_SCREEN_SHARE = 'updateScreenShare',
  RENAME_MATERIAL = 'renameMaterial',
  OPEN_CO_GUEST_PANEL = 'showCoGuestPanel',
  ACCEPT_CO_GUEST = 'acceptCoGuest',
  REJECT_CO_GUEST = 'rejectCoGuest',
  KICK_OFF_SEAT = 'kickOffSeat',
  UPDATE_USER_ON_SEAT = 'updateUserOnSeat',
  UPDATE_LAYOUT_TEMPLATE = 'updateLayoutTemplate',
  UPDATE_USER_PROFILE = 'updateUserProfile',
  SYNC_LIVE_INFO = 'syncLiveInfo',

  // ============== Music Panel Related ==============
  /** Child -> Main: user action dispatched from MusicPanelDialog */
  MUSIC_ACTION = 'musicAction',
  /** Main -> Child: music event passthrough (e.g. onPlayError) */
  MUSIC_EVENT = 'musicEvent',

  // ============== Media Source Related ==============
  /** Add a new media source */
  ADD_MEDIA_SOURCE = 'addMediaSource',
  /** Update existing media source */
  UPDATE_MEDIA_SOURCE = 'updateMediaSource',

  // ============== Device Related ==============
  /** Set current device (camera/mic/speaker) */
  SET_CURRENT_DEVICE = 'setCurrentDevice',
  /** Update device list notification */
  UPDATE_DEVICE_LIST = 'updateDeviceList',
  /** Start camera device test */
  START_CAMERA_DEVICE_TEST = 'startCameraDeviceTest',
  /** Stop camera device test */
  STOP_CAMERA_DEVICE_TEST = 'stopCameraDeviceTest',
  /** Set camera test render mirror */
  SET_CAMERA_TEST_RENDER_MIRROR = 'setCameraTestRenderMirror',
  /** Set camera test resolution */
  SET_CAMERA_TEST_RESOLUTION = 'setCameraTestResolution',
  /** Set camera test device id */
  SET_CAMERA_TEST_DEVICE_ID = 'setCameraTestDeviceId',
  /** Set camera test video plugin path */
  SET_CAMERA_TEST_VIDEO_PLUGIN_PATH = 'setCameraTestVideoPluginPath',
  /** Set camera test video plugin parameter */
  SET_CAMERA_TEST_VIDEO_PLUGIN_PARAMETER = 'setCameraTestVideoPluginParameter',
  /** Start speaker test */
  START_TEST_SPEAKER = 'startTestSpeaker',
  /** Stop speaker test */
  STOP_TEST_SPEAKER = 'stopTestSpeaker',
  /** Start microphone test */
  START_TEST_MIC = 'startTestMic',
  /** Stop microphone test */
  STOP_TEST_MIC = 'stopTestMic',
  /** Set current device volume */
  SET_CURRENT_DEVICE_VOLUME = 'setCurrentDeviceVolume',

  // ============== Audio Effect Related ==============
  /** Set voice reverb type */
  SET_VOICE_REVERB = 'setVoiceReverbType',
  /** Set voice changer type */
  SET_VOICE_CHANGER = 'setVoiceChangerType',
  /** Resume play music */
  RESUME_PLAY_MUSIC = 'resumePlayMusic',
  /** Pause play music */
  PAUSE_PLAY_MUSIC = 'pausePlayMusic',
  /** Stop play music */
  STOP_PLAY_MUSIC = 'stopPlayMusic',
  /** Set all music volume */
  SET_ALL_MUSIC_VOLUME = 'setAllMusicVolume',
  /** Set music publish volume */
  SET_MUSIC_PUBLISH_VOLUME = 'setMusicPublishVolume',
  /** Seek music to position in time */
  SEEK_MUSIC_TO_POS = 'seekMusicToPosInTime',
  /** Single loop play mode */
  SINGLE_LOOP_PLAY = 'singleLoopPlay',
  /** Sequential play mode */
  SEQUENTIAL_PLAY = 'sequentialPlay',
  /** Update audio effect data */
  UPDATE_AUDIO_EFFECT_DATA = 'updateAudioEffectData',
  /** Update playing music id */
  UPDATE_PLAYING_MUSIC_ID = 'updatePlayingMusicId',

  // ============== Co-Guest/Co-Host Related ==============
  /** Handle user apply for co-guest */
  HANDLE_USER_APPLY = 'handleUserApply',
  /** Kick user off seat */

  /** Kick user out of room */
  KICK_OUT_ROOM = 'kickOutRoom',
  /** Set co-guest layout template */
  SET_CO_GUEST_LAYOUT_TEMPLATE = 'setCoGuestLayoutTemplate',
  /** Set co-host setting */
  SET_CO_HOST_SETTING = 'setCoHostSetting',
  /** Fetch live list */
  FETCH_LIVE_LIST = 'fetchLiveList',
  /** Fetch more live list */
  FETCH_MORE_LIVE_LIST = 'fetchMoreLiveList',
  /** Request anchor connection */
  REQUEST_ANCHOR_CONNECTION = 'requestAnchorConnection',
  /** Cancel anchor connection */
  CANCEL_ANCHOR_CONNECTION = 'cancelAnchorConnection',
  /** Stop anchor connection */
  STOP_ANCHOR_CONNECTION = 'stopAnchorConnection',
  /** Start anchor battle */
  START_ANCHOR_BATTLE = 'startAnchorBattle',
  /** Request anchor battle */
  REQUEST_ANCHOR_BATTLE = 'requestAnchorBattle',
  /** Cancel anchor battle */
  CANCEL_ANCHOR_BATTLE = 'cancelAnchorBattle',
  /** Stop anchor battle */
  STOP_ANCHOR_BATTLE = 'stopAnchorBattle',

  // ============== State Sync Related ==============
  /** Sync room info to other windows */
  SYNC_ROOM_INFO = 'syncRoomInfo',
  /** Sync apply list to child window */
  SYNC_APPLY_LIST = 'syncApplyList',
  /** Sync stream layout to cover window */
  SYNC_STREAM_LAYOUT = 'syncStreamLayout',
  /** Sync media sources list */
  SYNC_MEDIA_SOURCES = 'syncMediaSources',
  /** Sync audio effect state */
  SYNC_AUDIO_EFFECT = 'syncAudioEffect',

  // ============== Theme & Language ==============
  /** Change theme */
  CHANGE_THEME = 'changeTheme',
  /** Change language */
  CHANGE_LANGUAGE = 'changeLanguage',

  // ============== Child Window Control ==============
  /** Show child window with specific panel */
  SHOW_CHILD_PANEL = 'showChildPanel',
  /** Close child window */
  HIDE_CHILD_PANEL = 'hideChildPanel',
  /** Update child window data */
  UPDATE_CHILD_DATA = 'updateChildData',
  /** Apply live setting action from child to main */
  APPLY_LIVE_SETTING = 'applyLiveSetting',
  /** Apply live title action from child to main */
  APPLY_LIVE_TITLE = 'applyLiveTitle',

  // ============== Confirm Window Control ==============
  /** Show confirm dialog window with payload */
  SHOW_CONFIRM_DIALOG = 'showConfirmDialog',
  /** User action from confirm dialog */
  CONFIRM_DIALOG_ACTION = 'confirmDialogAction',
  /** Close confirm dialog window */
  CLOSE_CONFIRM_DIALOG = 'closeConfirmDialog',
}

/**
 * IPC Message interface
 */
export interface IPCMessage<T = unknown> {
  /** Message type */
  type: IPCMessageType;
  /** Message payload */
  payload: T;
  /** Source window */
  from?: WindowType;
  /** Target window or broadcast */
  to?: MessageTarget;
  /** Message timestamp */
  timestamp?: number;
  /** Message ID for request-response pattern */
  messageId?: string;
}

/**
 * IPC Message handler callback type
 */
export type IPCMessageHandler<T = unknown> = (payload: T, from?: WindowType) => void;

/**
 * Device type for setCurrentDevice message
 */
export interface SetCurrentDevicePayload {
  deviceType: number;
  deviceId: string;
}

/**
 * Camera test payload
 */
export interface CameraTestPayload {
  windowID: Uint8Array;
  rect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  log?: string;
}

/**
 * Handle user apply payload
 */
export interface HandleUserApplyPayload {
  user: string;
  agree: boolean;
}

/**
 * Device volume payload
 */
export interface DeviceVolumePayload {
  type: number;
  volume: number;
}

/**
 * Mic test payload
 */
export interface MicTestPayload {
  interval: number;
  playback: boolean;
}

/**
 * Child panel types for SHOW_CHILD_PANEL message
 */
export enum ChildPanelType {
  None = '',
  Camera = 'Camera',
  Screen = 'Screen',
  Image = 'Image',
  PhoneMirror = 'PhoneMirror',
  OnlineVideo = 'OnlineVideo',
  VideoFile = 'VideoFile',
  CoGuestConnection = 'CoGuestConnection',
  CoHostConnection = 'CoHostConnection',
  Setting = 'Setting',
  AddBgm = 'AddBgm',
  ReverbVoice = 'ReverbVoice',
  ChangeVoice = 'ChangeVoice',
  Rename = 'Rename',
  UserProfile = 'UserProfile',
  LayoutConfig = 'LayoutConfig',
  LiveTitleSetting = 'LiveTitleSetting',
  Music = 'Music',
}

/**
 * Payload for SHOW_CHILD_PANEL message
 * Used to open child window with specific panel and optional initial data
 */
export interface ShowChildPanelPayload<T = Record<string, unknown>> {
  /** Panel type to show, determines which component to render */
  panelType: ChildPanelType;
  /** Optional window size override. If omitted, main process uses panelType defaults */
  windowSize?: { width: number; height: number };
  /** Initial data for the panel (optional) */
  initialData?: T;
}

/**
 * Payload for UPDATE_CHILD_DATA message
 * Used to push data updates to the currently active child panel.
 *
 * The generic `T` lets call sites strongly type the carried data (e.g.
 * `UpdateChildDataPayload<MusicPanelSnapshot>`). Defaults to `unknown`
 * for backward compatibility with untyped call sites.
 */
export interface UpdateChildDataPayload<T = unknown> {
  /** Target panel type - child window will ignore if current panel doesn't match */
  panelType: ChildPanelType;
  /** Data to pass to the panel */
  data: T;
}

/**
 * Discriminator tag for ADD/UPDATE_MEDIA_SOURCE payloads.
 * Lets the main window dispatch a child-window IPC payload to the correct
 * MediaSource builder without inspecting field shape.
 *
 * Currently only video sources need a tag because their dialog payload shape
 * (filePath/url/playoutVolume/...) doesn't carry sourceType directly. Camera
 * and screen payloads already carry sourceType natively, so they skip the tag.
 */
export type MediaKind = 'localVideo' | 'onlineVideo';

/**
 * Payload emitted by LocalVideoDialog when adding a local video file.
 * Sent through child -> main IPC as ADD_MEDIA_SOURCE with `mediaKind: 'localVideo'`.
 */
export interface AddLocalVideoPayload {
  mediaKind: 'localVideo';
  /** Absolute file path obtained via Electron's File.path extension */
  filePath: string;
  /** Display name, defaults to file basename */
  fileName: string;
  /** Playout volume, 0-100 */
  playoutVolume: number;
}

/**
 * Payload emitted by LocalVideoDialog when updating an existing local video.
 * Carries `predata` (the previous MediaSource) for main-window list lookup.
 */
export interface UpdateLocalVideoPayload extends AddLocalVideoPayload {
  /** Previous MediaSource snapshot for locating the existing entry */
  predata: Record<string, unknown>;
}

/**
 * Payload emitted by OnlineVideoDialog when adding a streaming URL.
 * Sent through child -> main IPC as ADD_MEDIA_SOURCE with `mediaKind: 'onlineVideo'`.
 */
export interface AddOnlineVideoPayload {
  mediaKind: 'onlineVideo';
  /** Streaming URL: rtmp/rtmps/http/https */
  url: string;
  /** Playout volume, 0-100 */
  playoutVolume: number;
  /** Network cache size in KB, used by SDK to control startup latency vs. smoothness */
  networkCacheSizeKB: number;
}

/**
 * Payload emitted by OnlineVideoDialog when updating an existing online video.
 */
export interface UpdateOnlineVideoPayload extends AddOnlineVideoPayload {
  predata: Record<string, unknown>;
}

/**
 * Music panel state snapshot pushed from main window to child window.
 * Used as both SHOW_CHILD_PANEL initialData and UPDATE_CHILD_DATA incremental payload.
 *
 * Child window consumes this as a read-only view; it never owns the real music state.
 * All field semantics mirror the state layer `IMusicState` and app-layer `MusicLibItem`.
 */
export interface MusicPanelSnapshot {
  /** Music library list, owned by useMusicLibrary on the main window */
  musicList: Array<{
    id: string;
    url: string;
    name: string;
    durationMs: number;
    addedAt: number;
    isNetwork: boolean;
    /** Whether this entry has been auto-marked as unplayable (e.g. after a
     *  recent `onPlayError`). Mirrors `MusicLibItem.isUnplayable`; child
     *  window uses it to render the "Unplayable" tag in the list. */
    isUnplayable: boolean;
  }>;
  /** Current playing URL, null when nothing is playing */
  playURL: string | null;
  /** Play status enum (Idle / Playing / Paused / Loading) */
  playStatus: MusicPlayStatus;
  /** Current playback position in milliseconds */
  playProgress: number;
  /** Total duration in milliseconds, 0 when unknown */
  totalDuration: number;
  /** Playback volume, 0-100 */
  musicVolume: number;
  /** Pitch value, -1.0 ~ 1.0 */
  musicPitch: number;
}

/**
 * Discriminated union for user intents dispatched from MusicPanelDialog (child window)
 * back to MusicButton (main window) via IPCMessageType.MUSIC_ACTION.
 *
 * Keeps all music intents under a single message type + typed payload, avoiding the
 * "one IPC type per action" sprawl (compare with CoGuest's 3 separate messages).
 */
export type MusicActionPayload =
  | { action: 'startPlay'; url: string }
  | { action: 'pausePlay' }
  | { action: 'resumePlay' }
  | { action: 'stopPlay' }
  | { action: 'seek'; positionMs: number }
  | { action: 'setVolume'; volume: number }
  | { action: 'setPitch'; pitch: number }
  | { action: 'addMusic'; urlOrFilePath: string; name?: string; durationMs?: number }
  | { action: 'removeMusic'; id: string };

/**
 * Music-related events passthrough from main window state layer to child window UI.
 * Currently only onPlayError needs to reach child (so it can show a toast);
 * onPlayCompleted stays on main since the "auto-play next track" logic lives there.
 */
export type MusicEventPayload =
  | { event: 'onPlayError'; url: string; code: number };



/**
 * Initial data for child live title setting panel.
 */
export interface LiveTitleSettingInitialData {
  /** Dialog instance id used for dedupe in main window */
  dialogId: string;
  /** Current live name displayed in input */
  liveName: string;
  /** Current cover url displayed in cover upload area */
  coverUrl?: string;
  /** Optional live name UTF-8 byte limit, defaults to 100 */
  maxLength?: number;
}

/** Known confirm dialog business scenes */
export type ConfirmDialogScene = 'end-live' | 'app-quit' | 'force-logout';

/** Backward-compatible alias for confirm scene type */
export type ConfirmDialogSceneLike = ConfirmDialogScene;

/**
 * Live setting action type for child -> main write flow
 */
export type LiveSettingActionType =
  | 'setPublishVideoQuality'
  | 'setCurrentMicrophone'
  | 'setCurrentSpeaker'
  | 'setCaptureVolume'
  | 'setOutputVolume'
  | 'startMicrophoneTest'
  | 'stopMicrophoneTest'
  | 'startSpeakerTest'
  | 'stopSpeakerTest';

/**
 * Payload for APPLY_LIVE_SETTING message
 */
export interface ApplyLiveSettingPayload {
  action: LiveSettingActionType;
  value?: number | string;
}

/**
 * Payload for APPLY_LIVE_TITLE message
 * Sent from child window to main window when user confirms/cancels live title editing.
 */
export interface ApplyLiveTitlePayload {
  /** Dialog instance id used for dedupe */
  dialogId: string;
  /** User action */
  action: 'confirm' | 'cancel';
  /** Live title value when action is confirm */
  liveName?: string;
  /** Live cover value when action is confirm */
  coverUrl?: string;
}

/**
 * Payload for CONFIRM_DIALOG_ACTION message
 * Sent from confirm window to main window when user clicks an action button
 */
export interface ConfirmDialogActionPayload {
  /** Business scene identifier, e.g. 'end-live' */
  scene?: ConfirmDialogSceneLike;
  /** Optional dialog instance id for dedupe/matching */
  dialogId?: string;
  /** Selected action value, e.g. 'cancel' / 'end-live' */
  action?: string;
}

/**
 * Payload for SHOW_CONFIRM_DIALOG message
 * Sent from main window to confirm window to display a dialog
 */
export interface ShowConfirmDialogPayload {
  /** Business scene identifier, e.g. 'end-live' */
  scene?: ConfirmDialogSceneLike;
  /** Optional dialog instance id for dedupe/matching */
  dialogId?: string;
  /** Dialog title */
  title?: string;
  /** Dialog content text */
  content?: string;
  /** Action buttons to render */
  actions?: Array<{
    text: string;
    value: string;
    type: string;
  }>;
}

/**
 * Payload for CLOSE_CONFIRM_DIALOG message
 * Sent to confirm window to hide/reset the current dialog
 */
export interface CloseConfirmDialogPayload {
  /** Business scene identifier, e.g. 'end-live' */
  scene?: ConfirmDialogSceneLike;
  /** Optional dialog instance id for dedupe/matching */
  dialogId?: string;
}

/**
 * Action types for renderer-to-main-process communication.
 * Messages with these types and `to: 'electron-main'` are consumed
 * by the main process directly (not forwarded to any renderer window).
 */
export enum MainProcessAction {
  // Window control
  MINIMIZE_WINDOW = 'minimizeWindow',
  MAXIMIZE_WINDOW = 'maximizeWindow',
  CLOSE_WINDOW = 'closeWindow',
  SET_WINDOW_SIZE = 'setWindowSize',

  // Cover window positioning
  SET_COVER_BOUNDS = 'setCoverBounds',
  SHOW_COVER_WINDOW = 'showCoverWindow',
  HIDE_COVER_WINDOW = 'hideCoverWindow',

  // System features
  SET_LANGUAGE = 'setLanguage',
  SHOW_CONTEXT_MENU = 'showContextMenu',
  SET_IGNORE_MOUSE_EVENTS = 'setIgnoreMouseEvents',

  // App lifecycle
  APP_QUIT_CONFIRMED = 'appQuitConfirmed',
  APP_QUIT_CANCEL = 'appQuitCancel',
}
