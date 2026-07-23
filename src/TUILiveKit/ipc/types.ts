/**
 * IPC Message Types and Interfaces
 * This module defines all message types for inter-window communication
 */
import {
  CoHostLayoutTemplate,
  CoHostStatus,
  MusicPlayStatus,
  SeatUserInfo,
} from 'tuikit-atomicx-vue3-electron';

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
  /** Main -> Cover: aggregated battle / co-host snapshot for cover-window PK UI */
  SYNC_BATTLE_STATE = 'syncBattleState',

  // ============== Music Panel Related ==============
  /** Child -> Main: user action dispatched from MusicPanelDialog */
  MUSIC_ACTION = 'musicAction',
  /** Main -> Child: music event passthrough (e.g. onPlayError) */
  MUSIC_EVENT = 'musicEvent',

  // ============== CoHost / Battle Panel Related ==============
  /** Child -> Main: user action dispatched from CoHostPanelDialog (cohost / battle / config) */
  COHOST_ACTION = 'cohostAction',
  /** Main -> Child: cohost / battle event passthrough (toast lifecycle, etc.) */
  COHOST_EVENT = 'cohostEvent',

  // ============== Media Source Related ==============
  /** Add a new media source */
  ADD_MEDIA_SOURCE = 'addMediaSource',
  /** Update existing media source */
  UPDATE_MEDIA_SOURCE = 'updateMediaSource',
  /**
   * Main -> Child: a camera media source was removed from the scene. The child
   * closes the currently-open camera panel only when it is editing that exact
   * camera, validating against its own live editing-camera id. This lets an
   * unrelated removal (or the stale id dropped during an in-dialog device
   * switch) be ignored safely.
   */
  CAMERA_REMOVED = 'cameraRemoved',
  /**
   * Main -> Child: adding a camera media source failed (e.g. the device is
   * occupied by another app or its driver is abnormal). The child surfaces an
   * error toast so the user understands why no preview appeared, while keeping
   * the camera panel open so a different (working) camera can still be picked.
   */
  CAMERA_ADD_FAILED = 'cameraAddFailed',
  /**
   * Main -> Child: a camera add / switch operation has finished on the main
   * side (success OR failure). The child uses this purely to release the
   * "operation in flight" lock that disables the camera dropdown while the
   * previous pick is still being applied, preventing rapid out-of-order
   * switches. Sent from the finally of the add/update handlers.
   */
  CAMERA_OP_DONE = 'cameraOpDone',

  // ============== Beauty / Video Effect Related ==============
  /**
   * Child -> Main: full snapshot of the camera's beauty effect properties.
   * The child window's effectStore holds the source-of-truth state and emits
   * the full property set on every change (slider drag / item pick / reset),
   * so the main window can apply it to videoEffectManager without merging.
   */
  BEAUTY_UPDATE = 'beautyUpdate',

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
  /** Initial data for the panel (optional). Typically the edited MediaSource. */
  initialData?: T;
  /**
   * Per-panel extra context that is NOT part of the edited media source itself.
   * Currently used by the camera dialog to carry:
   *   - usedCameraIds: deviceIds already in the main window's media source list
   *     so the dropdown can disable already-used cameras.
   *   - effectConstant: the result of TRTCXmagicFactory.getEffectConstant(custom, history).
   *     In edit mode the main window passes the camera's existing properties
   *     so details[i].effValue/isSelected are already merged; the child renders
   *     it directly without doing its own initValue merge.
   * Kept generic so future panels can carry their own auxiliary context without
   * bloating `initialData`'s shape contract.
   */
  extra?: Record<string, unknown>;
}

/**
 * Payload for IPCMessageType.BEAUTY_UPDATE.
 * Sent from child window's CameraSettingDialog to the main window every time
 * the user adjusts a slider, picks an effect option, or hits a reset entry.
 *
 * Incremental contract: `properties` is the FULL deduped snapshot the child
 * considers active (kept for the main-window per-camera cache + camera-switch
 * migration); `delta` is the INCREMENTAL set to push to the native plugin this
 * tick (changed/added props + 0-clears for ones that disappeared). When `delta`
 * is omitted, the main window does a forced FULL apply (startEffect) — used on
 * first apply / camera switch. An empty `properties` means "clear everything".
 */
export interface BeautyUpdatePayload {
  /** Camera deviceId (== MediaSource.sourceId for camera-typed sources). */
  cameraId: string;
  /**
   * Full set of TRTCXmagicEffectProperty entries currently active for the camera.
   * Typed loosely as `unknown[]` here to avoid pulling the xmagic plugin types
   * into the IPC layer; the main and child sides share a typed helper module.
   */
  properties: unknown[];
  /**
   * Incremental changes since the previous emit, to push to native this tick.
   * Absent for a forced full apply (the main window then applies `properties`).
   */
  delta?: unknown[];
  /**
   * Stable identity (labelKey/key) of the currently-selected beautyTemplate
   * tile, or null/absent when none. The main window persists this per camera so
   * re-editing can restore the template highlight by identity, instead of
   * reverse-matching the expanded effValues (which drift once the user tweaks a
   * mapped intensity slider and would otherwise lose the highlight — and strand
   * the effect on native — across a dialog reopen).
   */
  selectedTemplateKey?: string | null;
}

/**
 * Payload for IPCMessageType.CAMERA_REMOVED.
 * Sent from the main window to the child window when a camera source is removed
 * from the media source list, so the child can self-close the camera panel if
 * it is currently editing that exact camera.
 */
export interface CameraRemovedPayload {
  /** deviceId (== MediaSource.sourceId) of the removed camera source. */
  cameraId: string;
}

/**
 * Payload for IPCMessageType.CAMERA_ADD_FAILED.
 * Sent from the main window to the child window when addMediaSource() rejects
 * for a camera source, so the child can show an error toast without closing the
 * camera panel.
 */
export interface CameraAddFailedPayload {
  /** deviceId (== MediaSource.sourceId) of the camera that failed to add. */
  cameraId: string;
  /** Localized, user-facing failure message rendered by the child toast. */
  message: string;
}

/**
 * Payload for IPCMessageType.CAMERA_OP_DONE.
 * Sent from the main window to the child window when a camera add / switch
 * operation finishes (regardless of success), so the child can release the
 * camera-dropdown lock that blocks further picks until the previous op settles.
 */
export interface CameraOpDonePayload {
  /** deviceId (== MediaSource.sourceId) of the camera the operation targeted. */
  cameraId: string;
  /** Whether the operation succeeded (false when add/switch failed). */
  ok: boolean;
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
 * Battle / CoHost state snapshot pushed from the main window to the cover window.
 *
 * The cover window owns no atomicx state of its own; therefore the main window
 * aggregates the minimal slice of `useBattleState` / `useLiveSeatState` /
 * `useCoHostState` / `useLiveListState` that the cover-side PK UI needs and
 * forwards it via IPC. All gating logic in the cover (showPkBar /
 * showBattleUserDecorate / victory-defeat-draw computation) is derived purely
 * from this snapshot.
 *
 * Maps cannot survive structured-clone safely across IPC, so `battleScore` is
 * serialized as a plain `[userId, score][]` array — mirroring how
 * `CoHostPanelSnapshot.battleScore` is already handled.
 */
export interface BattleStateSnapshot {
  /** Current battleId, empty string when no battle is in progress. */
  battleId: string;
  /** Battle duration in seconds, mirrors currentBattleInfo.config.duration. */
  battleDuration: number;
  /** Battle start timestamp in seconds (epoch), mirrors currentBattleInfo.startTime. */
  startTime: number;
  /** Slim copy of users currently in this battle (only fields the cover renders). */
  battleUsers: Array<{
    userId: string;
    userName?: string;
    avatarUrl?: string;
  }>;
  /** Battle score map serialized as a plain array of [userId, score] pairs. */
  battleScore: Array<[string, number]>;
  /** layoutTemplate of currentLive, used to gate showPkBar / showBattleUserDecorate. */
  layoutTemplate: number;
  /**
   * Number of seats whose userInfo is non-null, mirrors
   * `seatList?.filter(seat => seat.userInfo).length`. Used by `showPkBar`.
   */
  connectedSeatCount: number;
  /**
   * Number of co-hosts in `useCoHostState().connected`. Used by
   * `showBattleUserDecorate` (`> 2` triggers per-seat badge / score overlay).
   */
  connectedHostCount: number;
  /**
   * Whether the most recent battle teardown was a genuine `onBattleEnded`
   * (countdown timeout, or remaining members dropped to <= 1), as opposed to
   * a 3+ host PK where this host actively quits (which fires only
   * `onUserExitBattle`). The cover window plays the PK result animation only
   * when this is `true`, matching the Mac / Web kits.
   */
  battleEndedNormally: boolean;
}


/**
 * CoHost / Battle panel state snapshot pushed from main window to child window.
 * Used as both SHOW_CHILD_PANEL initialData and UPDATE_CHILD_DATA incremental payload.
 *
 * Mirrors the read-only flow already adopted for MusicPanelSnapshot: the child
 * window owns no real CoHost / Battle state — every reactive ref consumed by
 * the panel is sourced from this snapshot which is rebuilt on the main window
 * whenever any underlying state changes.
 */
export interface CoHostPanelSnapshot {
  /** Slim copy of useLoginState().loginUserInfo (only fields the panel reads). */
  loginUserInfo: {
    userId: string;
    userName?: string;
    avatarUrl?: string;
  } | null;
  /** Slim copy of useLiveListState().currentLive (only fields the panel reads). */
  currentLive: {
    liveId: string;
    liveName?: string;
    coverUrl?: string;
    /** Current live layout template (used to derive LiveOrientation). */
    layoutTemplate?: number;
  } | null;

  // ============== useCoHostState ==============
  /** Aggregated co-host status (Connected / Disconnected). */
  coHostStatus: CoHostStatus;
  /** Recommended host candidates from the latest fetch page. */
  candidates: SeatUserInfo[];
  /** Pagination cursor for getCoHostCandidates. Empty string means "no more". */
  candidatesCursor: string;
  /** Hosts currently invited but not yet accepted. */
  invitees: SeatUserInfo[];
  /** Hosts currently in the connected list (includes self when connected). */
  connected: SeatUserInfo[];
  /** Inbound co-host applicant info (the user who sent us a request). */
  applicant: SeatUserInfo | null;
  /**
   * List of liveIds for which we have muted the remote host audio.
   * Owned by the main window so the toggle survives child window reopen.
   */
  mutedHostLiveIds: string[];

  // ============== useBattleState ==============
  /** Current battleId, empty string when no battle is active. */
  battleId: string;
  /** Users currently in the battle. */
  battleUsers: SeatUserInfo[];
  /** Battle score map serialized as a plain array of [userId, score] pairs. */
  battleScore: Array<[string, number]>;
  /**
   * Pending outbound battle requests keyed by inviteeUserId. Used by the
   * "Cancel battle" button to render correctly after a re-open.
   */
  pendingBattleRequestUserIds: string[];
  /** BattleId of the request currently in flight (empty when none). */
  pendingBattleRequestId: string;
  /**
   * Outbound co-host invitations that have been "Sent" but not yet finalized
   * (accepted/rejected/cancelled/timed out). Used by the BattlePanel "Invite battle"
   * vs "Cancel invitation" toggle and the with-battle path on the main window.
   */
  pendingPkInviteeUserIds: string[];

  // ============== Invite mutual-exclusion (PK vs connection) ==============
  /**
   * True while at least one "Invite battle" (PK) invitation is still pending.
   * Derived on the main window from `pendingPkInviteeUserIds`. When true the
   * child window disables all "Invite connection" buttons so the two invite
   * kinds stay mutually exclusive (more PK invites may still be sent).
   */
  hasPendingBattleInvite: boolean;
  /**
   * True while at least one "Invite connection" invitation is still pending.
   * Derived on the main window from the outbound co-host request set. When true
   * the child window disables all "Invite battle" buttons so the two invite
   * kinds stay mutually exclusive (more connection invites may still be sent).
   */
  hasPendingConnectionInvite: boolean;
  /**
   * True while a Battle-tab-initiated PK is still auto-starting on the main
   * window: i.e. any battle invite is still pending, any accepter is parked
   * waiting to connect, the connection-ready safety timer is armed, or the
   * aggregated `requestBattle` is in flight (covers the gap between the co-host
   * connection being established and `onBattleStarted`). When true the child
   * window disables its "Start battle" button so the user cannot fire a
   * duplicate `requestBattle` for the same round. Does NOT block sending more
   * battle invites — multiple hosts may be invited and all accepters join.
   */
  hasPendingBattleAutoStart: boolean;

  // ============== ConfigSettingPanel form ==============
  /** Battle settings form, owned by main window for cross-reopen persistence. */
  configForm: {
    battleDuration: number;
    coHostLayoutTemplate: CoHostLayoutTemplate;
  };
}

/**
 * User intents dispatched from CoHostPanelDialog (child window) back to
 * CoHostButton (main window) via IPCMessageType.COHOST_ACTION.
 *
 * Discriminated union mirrors MusicActionPayload, keeping all CoHost/Battle
 * intents under a single message type with strongly-typed payloads.
 */
export type CoHostActionPayload =
  // —— Candidate pagination ——
  | { action: 'getCandidates'; cursor: string }
  // —— Co-host (connection) ——
  | {
      action: 'requestConnection';
      liveId: string;
      userId: string;
      userName?: string;
      withBattle: boolean;
      timeoutSec: number;
    }
  | { action: 'cancelConnection'; liveId: string; userId: string }
  | { action: 'acceptConnection' }
  | { action: 'rejectConnection' }
  | { action: 'exitConnection' }
  | { action: 'muteRemoteHostAudio'; liveId: string; mute: boolean }
  // —— Battle (PK) ——
  | {
      action: 'requestBattle';
      userIdList: string[];
      battleDuration: number;
      timeoutSec: number;
    }
  | { action: 'cancelBattleRequest' }
  // —— ConfigSettingPanel form ——
  | {
      action: 'setConfigForm';
      battleDuration: number;
      coHostLayoutTemplate: CoHostLayoutTemplate;
    };

/**
 * CoHost / Battle events pushed from main window to child window via
 * IPCMessageType.COHOST_EVENT, used to drive child-side toast UX whose state
 * is authoritatively maintained on the main window.
 */
export type CoHostEventPayload =
  // Show co-host "invitation sent" success toast and remember its close handle for later dismissal.
  | { event: 'connectionSentToast'; userId: string; userName?: string }
  // Close a previously-shown co-host "invitation sent" toast (e.g. after reject/timeout/cancel).
  | { event: 'closeSentToast'; userId: string }
  // Show "battle invitation sent" success toast (no close handle is kept;
  // mirrors kit BattlePanel which lets the toast finish its own life-cycle).
  | { event: 'battleSentToast'; userId: string; userName?: string }
  // Generic error toast forwarded from main-window state-layer rejections.
  | { event: 'errorToast'; message: string };




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
export type ConfirmDialogScene = 'end-live' | 'app-quit' | 'force-logout' | 'logout';

/** Backward-compatible alias for confirm scene type */
export type ConfirmDialogSceneLike = ConfirmDialogScene;

/**
 * Action values dispatched from the `end-live` confirm dialog. Centralized
 * here so the producer (TUILiveKitWin.showEndLiveConfirmWindow) and the
 * consumer (TUILiveKitWin.onConfirmDialogAction) share a single source of
 * truth — adding a new dangerous action requires touching this union and
 * the value map below, which surfaces missed branches via TS exhaustiveness.
 */
export type EndLiveAction = 'cancel' | 'end-live' | 'end-battle' | 'exit-connection';

/**
 * Const object mirror of `EndLiveAction` so call sites can write
 * `EndLiveActionValue.EndBattle` instead of repeating string literals.
 * The `as const satisfies` pair guarantees:
 *   - values are narrowed to the literal union (TS catches typos),
 *   - the map is exhaustive over `EndLiveAction` (adding a member to the
 *     union without updating the map fails to compile).
 */
export const EndLiveActionValue = {
  Cancel: 'cancel',
  EndLive: 'end-live',
  EndBattle: 'end-battle',
  ExitConnection: 'exit-connection',
} as const satisfies Record<string, EndLiveAction>;

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
