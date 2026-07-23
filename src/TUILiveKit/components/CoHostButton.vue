<template>
  <div
    class="custom-icon-container"
    :class="{ 'disabled': isCoHostDisabled }"
    @click="handleCoHost"
  >
    <IconCoHost class="custom-icon" />
    <span class="custom-text co-host-text">{{ t('CoHost') }}</span>
  </div>
  <!-- Self-managed mode (Mac, or Windows without child-window flag): kit panel owns its state. -->
  <CoHostPanel
    v-if="!props.isShowingInChildWindow"
    v-model:visible="coHostPanelVisible"
    class="co-host-panel"
  />
</template>

<script lang="ts" setup>
/**
 * CoHostButton supports two modes:
 *
 * - `isShowingInChildWindow=false` (default, Mac): renders the kit's stateful
 *   `<CoHostPanel>` inline. The kit panel owns CoHostState / BattleState
 *   directly and runs the full UX without IPC.
 *
 * - `isShowingInChildWindow=true` (Windows): opens a real child BrowserWindow
 *   and pushes a read-only `CoHostPanelSnapshot` over IPC. This component
 *   (main window) remains the sole owner of the CoHost / Battle state and the
 *   "pending invitation" / "muted hosts" / "config form" bookkeeping; the child
 *   window's `<CoHostPanelDialog>` is a pure view that emits user intents back
 *   over IPC (`COHOST_ACTION`), and toast UX is driven via `COHOST_EVENT`.
 *
 * Mirrors the dual-mode pattern already in use by MusicButton.vue.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  IconCoHost,
  useUIKit,
} from '@tencentcloud/uikit-base-component-vue3';
import { showMessage, MessageToastType } from '../base-component/MessageToast';
import { TUIBattleCode, TUIConnectionCode } from '@tencentcloud/tuiroom-engine-electron';
import {
  BattleEvent,
  CoHostEvent,
  CoHostLayoutTemplate,
  CoHostPanel,
  CoHostStatus,
  LiveOrientation,
  useBattleState,
  useCoGuestState,
  useCoHostState,
  useLiveListState,
  useLiveSeatState,
  useLoginState,
} from 'tuikit-atomicx-vue3-electron';
import type { SeatUserInfo } from 'tuikit-atomicx-vue3-electron';
import {
  ChildPanelType,
  IPCMessageType,
  ipcBridge,
  toPlainIpcPayload,
} from '../ipc';
import type {
  CoHostActionPayload,
  CoHostEventPayload,
  CoHostPanelSnapshot,
  ShowChildPanelPayload,
  UpdateChildDataPayload,
} from '../ipc';

const props = defineProps({
  isShowingInChildWindow: {
    type: Boolean,
    default: false,
  },
});

const { t } = useUIKit();

// ==================== State (single ownership on main window) ====================
// useCoHostState / useBattleState are module-level singletons; resolving them
// here on the main window guarantees we own the canonical state regardless of
// whether the child window is open. The Mac path's <CoHostPanel> resolves the
// same singletons internally — duplicate resolution is cheap and idempotent.
const { loginUserInfo } = useLoginState();
const { currentLive } = useLiveListState();
const { seatList } = useLiveSeatState();
const { applicants: coGuestApplicants } = useCoGuestState();

const {
  coHostStatus,
  connected,
  invitees,
  applicant,
  candidates,
  candidatesCursor,
  mutedHosts,
  requestHostConnection,
  cancelHostConnection,
  exitHostConnection,
  acceptHostConnection,
  rejectHostConnection,
  muteRemoteHostAudio,
  getCoHostCandidates,
  subscribeEvent: subscribeCoHostEvent,
  unsubscribeEvent: unsubscribeCoHostEvent,
} = useCoHostState();
const {
  currentBattleInfo,
  battleUsers,
  battleScore,
  requestBattle,
  cancelBattleRequest,
  subscribeEvent: subscribeBattleEvent,
  unsubscribeEvent: unsubscribeBattleEvent,
} = useBattleState();

// Mirrors kit's CoHostButton enable/disable rules: cannot start co-host when
// not yet live, or when audience co-guest is already running.
const isInCoGuest = computed(() =>
  seatList.value.filter((item: { userInfo?: { userId?: string; liveId?: string } }) =>
    item.userInfo?.userId && item.userInfo?.liveId === currentLive.value?.liveId).length >= 2,
);
const hasCoGuestApplicants = computed(() => coGuestApplicants.value.length > 0);
const isCoHostDisabled = computed(() => !currentLive.value?.liveId || isInCoGuest.value || hasCoGuestApplicants.value);

// Whether the local user enters a PK, auto-close the CoHost panel — same behavior
// the kit CoHostPanel.vue implements via watch(inPk, …, emit('update:visible')).
const inPk = computed(() =>
  battleUsers.value.some(u => u.userId === loginUserInfo.value?.userId),
);

// ==================== Invite mutual-exclusion (PK vs connection) ====================
// The two outbound invite kinds are mutually exclusive: while any "Invite
// battle" (PK) is still pending, all "Invite connection" buttons are disabled,
// and vice-versa. Same kind may be sent multiple times. Both flags are derived
// from the main window's per-kind pending sets (which already settle on
// accept / reject / cancel / timeout), pushed to the child via the snapshot.
const hasPendingBattleInvite = computed(() => pendingPkInviteeUserIds.value.size > 0);
const hasPendingConnectionInvite = computed(() => sentCoHostRequestUserList.value.size > 0);

// True while a Battle-tab-initiated PK is still auto-starting: any battle
// invite is still pending, any accepter is parked waiting to connect, the
// connection-ready safety timer is armed, or the aggregated `requestBattle` is
// in flight (covers the gap between the co-host connection being established
// and `onBattleStarted`). Pushed to the child via the snapshot so its
// "Start battle" button is disabled for the whole auto-start window, preventing
// a duplicate `requestBattle` for the same round. Mirrors `battleAutoStart.ts`
// in the kit (Web / Mac) so the three ends behave identically. This does NOT
// block sending more battle invites — multiple hosts may be invited at once and
// every accepter joins the same aggregated PK.
//
// `isPendingBattleAsReceiver` folds in the receiver-side branch of the same
// two-phase window: when we accepted a withBattle invite, the connection is
// established but the PK has not started yet, so the inviter is about to fire
// the aggregated `requestBattle`. Merging it here (rather than adding a new
// snapshot field) means the child's "Exit connection" / "Start battle" buttons
// and the authoritative `exitConnection` / `requestBattle` guards below all
// cover the receiver case automatically. Mirrors the kit's ConnectionPanel.vue.
const hasPendingBattleAutoStart = computed(() =>
  pendingPkInviteeUserIds.value.size > 0
  || acceptedPkInviteeUserIds.value.size > 0
  || connectionReadyTimerArmed.value
  || isFiringAggregatedBattle.value
  || isPendingBattleAsReceiver.value,
);

// Mac-mode self-managed visibility for the kit's <CoHostPanel>.
const coHostPanelVisible = ref(false);

// ==================== Main-window owned bookkeeping ====================
// All of these refs are window-local "intermediate" state that the kit panel
// keeps internally on Mac (in BattlePanel / ConnectionPanel / ConfigSettingPanel).
// In Windows mode the child dialog is read-only, so the bookkeeping moves up
// here and is pushed to the child via the snapshot.
// Note: mutedHosts is sourced from the atomic CoHostState, which already
// handles prune-on-disconnect and clear-on-live-end — no local duplicate needed.
// Outbound co-host "Invitation sent" toasts whose close-handle lives in the
// child window. We only need the userId set on main to know who to dismiss.
const sentCoHostRequestUserList = ref<Set<string>>(new Set());
// Authoritative re-entrancy guard for outbound co-host requests, keyed by
// liveId. The child window's invite button can be clicked again during the
// child -> IPC -> main -> requestHostConnection round-trip (the button only
// flips to "Cancel invitation" after the invitees snapshot is pushed back), so
// a second action could re-issue the request for the same liveId and the SDK
// returns an error code, surfacing a spurious "send failed" toast right after
// the "send success" one. We ignore re-entrant actions for an in-flight liveId
// here, on the main window, where the actual SDK call happens.
const pendingRequestConnectionLiveIds = ref<Set<string>>(new Set());
// Battle-invite probing set. A user lands here right after we send a co-host
// request with `withBattle: true`, and is removed once we either successfully
// kick off the battle (CoHostRequestAccepted), the invite is rejected/timed-out,
// or the user cancels it manually.
const pendingPkInviteeUserIds = ref<Set<string>>(new Set());
// Battle invitees who have already accepted the co-host invite in the current
// round. They stay here until `pendingPkInviteeUserIds` drains, at which point
// a single aggregated `needResponse: false` battle is fired for all of them.
// Main-window-private: intentionally NOT part of the snapshot pushed to child.
const acceptedPkInviteeUserIds = ref<Set<string>>(new Set());
// Outbound battle invitation list (after the connection is established and
// the user explicitly clicks "Start battle"). Cleared on accept/reject/timeout
// or on battle started/ended.
const pendingBattleRequestUserIds = ref<Set<string>>(new Set());
const pendingBattleRequestId = ref('');
// Authoritative re-entrancy guard for the outbound "Start battle" request.
// The child window's "Start battle" button only flips to "Cancel battle" after
// `pendingBattleRequestUserIds` is populated and pushed back via the snapshot,
// so a second click during the child -> IPC -> main -> requestBattle round-trip
// could otherwise re-issue the request and surface a spurious "send failed"
// toast. This guard lives solely here, on the main window where the SDK call
// happens, and silently drops any re-entrant `requestBattle` action while a
// request is in flight; the child therefore needs no local lock and no
// `:disabled` state, exactly like the in-list "Invite connection" button which
// is also guarded only by the main window (`pendingRequestConnectionLiveIds`).
// A single boolean suffices since there is only one battle-initiate button.
const isRequestingBattle = ref(false);
// ==================== Receiver-side two-phase battle guard ====================
// Receiver counterpart of the inviter's auto-start signal. A PK started via
// "Invite battle" reaches the invitee first as a plain co-host request carrying
// `extensionInfo.withBattle: true`; the PK itself only begins later when the
// inviter fires the aggregated `requestBattle` (onBattleStarted). Between the
// invitee accepting (coHostStatus -> Connected) and onBattleStarted, the footer
// would briefly show an enabled "Exit connection" / "Start battle" pair; acting
// in that window tears down the hand-off and aborts the PK. `isPendingBattle-
// AsReceiver` is OR-ed into `hasPendingBattleAutoStart` above so it disables
// both buttons (on the child via the snapshot) and blocks the authoritative
// `exitConnection` / `requestBattle` guards for the whole window. Mirrors the
// kit's ConnectionPanel.vue receiver guard so the three ends behave identically.
const isPendingBattleAsReceiver = ref(false);
// Set when the most recent inbound co-host invite carried withBattle=true, and
// consumed on the next coHostStatus -> Connected transition to raise
// `isPendingBattleAsReceiver`. A plain invite (withBattle=false), a cancelled/
// timed-out invite, or initiating our own outbound request clears it so a later
// plain co-host connection never inherits the receiver guard.
const receiverBattleInvitePending = ref(false);
// Battle settings form. Owned here so it survives child window reopen.
const configForm = ref<{ battleDuration: number; coHostLayoutTemplate: CoHostLayoutTemplate }>({
  battleDuration: 5 * 60,
  coHostLayoutTemplate: CoHostLayoutTemplate.HostDynamicGrid,
});

// Whether the child CoHost window is currently open. Updated locally on click
// and by HIDE_CHILD_PANEL from the main process.
const isCoHostChildOpen = ref(false);

// Error code -> i18n key for battle request rejections. Mirrors kit constants.
const BATTLE_ERROR_MESSAGE: Record<number, string> = {
  100412: 'there is no one valid room for battle',
};

// ==================== Layout-template orientation helper ====================
// Same rule used by kit BattlePanel / ConnectionPanel: layoutTemplate ids in
// [200, 599] are landscape; landscape lives must use the fixed 2-seat layout.
const currentLiveOrientation = computed(() => {
  const layout = currentLive.value?.layoutTemplate;
  if (typeof layout === 'number' && layout >= 200 && layout <= 599) {
    return LiveOrientation.Landscape;
  }
  return LiveOrientation.Portrait;
});
const effectiveCoHostLayoutTemplate = computed(() => {
  if (currentLiveOrientation.value === LiveOrientation.Landscape) {
    return CoHostLayoutTemplate.HostVideoLandscapeFixed2Seats;
  }
  return configForm.value.coHostLayoutTemplate;
});

// Keep `configForm.coHostLayoutTemplate` in sync with the current live
// orientation so the settings dialog always renders a default option as
// "selected", and so the canonical `configForm` (the one pushed via the
// snapshot to the child window) reflects a value that is legal for the
// running live's orientation.
//
// Without this watcher the form stays at its initialization value
// (`HostDynamicGrid`) forever, which causes the highlight to disappear in
// landscape lives (only `HostVideoLandscapeFixed2Seats` is offered there)
// and stays on `HostVideoLandscapeFixed2Seats` if the user switches back to
// a portrait live after picking it. Mirrors the same fix in the kit's
// `CoHostPanel.vue`.
watch(currentLiveOrientation, (orientation) => {
  if (orientation === LiveOrientation.Landscape) {
    if (configForm.value.coHostLayoutTemplate !== CoHostLayoutTemplate.HostVideoLandscapeFixed2Seats) {
      configForm.value.coHostLayoutTemplate = CoHostLayoutTemplate.HostVideoLandscapeFixed2Seats;
    }
  } else if (configForm.value.coHostLayoutTemplate === CoHostLayoutTemplate.HostVideoLandscapeFixed2Seats) {
    // Coming back to a portrait live after the landscape-only template was
    // selected: fall back to the portrait default so the dialog has a valid
    // selection on next open.
    configForm.value.coHostLayoutTemplate = CoHostLayoutTemplate.HostDynamicGrid;
  }
}, { immediate: true });

// ==================== Snapshot construction & push ====================
function buildSnapshot(): CoHostPanelSnapshot {
  return {
    loginUserInfo: loginUserInfo.value
      ? {
        userId: loginUserInfo.value.userId,
        userName: loginUserInfo.value.userName,
        avatarUrl: loginUserInfo.value.avatarUrl,
      }
      : null,
    currentLive: currentLive.value
      ? {
        liveId: currentLive.value.liveId,
        liveName: currentLive.value.liveName,
        coverUrl: currentLive.value.coverUrl,
        layoutTemplate: currentLive.value.layoutTemplate,
      }
      : null,

    coHostStatus: coHostStatus.value,
    candidates: candidates.value.map(u => ({ ...u })),
    candidatesCursor: candidatesCursor.value,
    invitees: invitees.value.map(u => ({ ...u })),
    connected: connected.value.map(u => ({ ...u })),
    applicant: applicant.value ? { ...applicant.value } : null,
    mutedHostLiveIds: mutedHosts.value,

    battleId: currentBattleInfo.value?.battleId || '',
    battleUsers: battleUsers.value.map(u => ({ ...u })),
    // Map<string, number> is not structured-cloneable across all renderer-
    // process boundaries reliably; serialize to a plain entries array.
    battleScore: Array.from(battleScore.value.entries()),
    pendingBattleRequestUserIds: Array.from(pendingBattleRequestUserIds.value),
    pendingBattleRequestId: pendingBattleRequestId.value,
    pendingPkInviteeUserIds: Array.from(pendingPkInviteeUserIds.value),

    hasPendingBattleInvite: hasPendingBattleInvite.value,
    hasPendingConnectionInvite: hasPendingConnectionInvite.value,
    hasPendingBattleAutoStart: hasPendingBattleAutoStart.value,

    configForm: { ...configForm.value },
  };
}

function pushSnapshot() {
  if (!props.isShowingInChildWindow || !isCoHostChildOpen.value) return;
  ipcBridge.sendToChild<UpdateChildDataPayload<CoHostPanelSnapshot>>(IPCMessageType.UPDATE_CHILD_DATA, {
    panelType: ChildPanelType.CoHostConnection,
    data: toPlainIpcPayload(buildSnapshot()),
  });
}

function emitCoHostEvent(payload: CoHostEventPayload) {
  if (!props.isShowingInChildWindow || !isCoHostChildOpen.value) return;
  ipcBridge.sendToChild<CoHostEventPayload>(IPCMessageType.COHOST_EVENT, toPlainIpcPayload(payload));
}

// ==================== Button click ====================
const handleCoHost = () => {
  if (isCoHostDisabled.value) {
    const message = !currentLive.value?.liveId
      ? t('Cannot use co-host before live starts')
      : t('Cannot co-host with other hosts while audience co-hosting is active');
    showMessage({ type: MessageToastType.Error, message });
    return;
  }
  if (props.isShowingInChildWindow) {
    isCoHostChildOpen.value = true;
    ipcBridge.sendToChild<ShowChildPanelPayload<CoHostPanelSnapshot>>(IPCMessageType.SHOW_CHILD_PANEL, {
      panelType: ChildPanelType.CoHostConnection,
      initialData: toPlainIpcPayload(buildSnapshot()),
    });
  } else {
    coHostPanelVisible.value = true;
  }
};

// ==================== Disable-side-effect cleanup ====================
// Same behavior the Mac kit panel implements internally: when the live ends
// or the user enters CoGuest, the CoHost panel must auto-close. In Windows
// mode the child window is hidden via the main process bridge.
// Also clear all Windows-only "invitation sent" / "battle pending" local refs
// so they never leak across live sessions. Atomic state (invitees, connected,
// candidates, mutedHosts) is already pruned by CoHostState.ts.
watch(isCoHostDisabled, (disabled) => {
  if (!disabled) return;
  coHostPanelVisible.value = false;
  if (props.isShowingInChildWindow && isCoHostChildOpen.value) {
    ipcBridge.sendToElectronMain(IPCMessageType.HIDE_CHILD_PANEL, {
      panelType: ChildPanelType.CoHostConnection,
    });
    isCoHostChildOpen.value = false;
  }
  sentCoHostRequestUserList.value.clear();
  pendingRequestConnectionLiveIds.value.clear();
  pendingPkInviteeUserIds.value.clear();
  acceptedPkInviteeUserIds.value.clear();
  clearConnectionReadyTimer();
  isFiringAggregatedBattle.value = false;
  pendingBattleRequestUserIds.value.clear();
  pendingBattleRequestId.value = '';
  isRequestingBattle.value = false;
  // Clear the receiver-side two-phase battle guard/marker as well, so a session
  // boundary (live-end / CoGuest) never leaves the receiver's buttons stuck.
  isPendingBattleAsReceiver.value = false;
  receiverBattleInvitePending.value = false;
});

// When the local user enters a PK (onBattleStarted fires from the SDK), auto-close
// the CoHost panel so the UI transitions to the live battle scene. Mirrors the kit
// CoHostPanel.vue: watch(inPk, ..., emit('update:visible', false)).
watch(inPk, (entering) => {
  if (!entering) return;
  coHostPanelVisible.value = false;
  if (props.isShowingInChildWindow && isCoHostChildOpen.value) {
    ipcBridge.sendToElectronMain(IPCMessageType.HIDE_CHILD_PANEL, {
      panelType: ChildPanelType.CoHostConnection,
    });
    isCoHostChildOpen.value = false;
  }
});

// ==================== Receiver-side two-phase battle guard wiring ====================
// Consume the `receiverBattleInvitePending` marker on the connection
// transition. When a connection accepted from a withBattle invite becomes
// established, raise `isPendingBattleAsReceiver` (which folds into
// `hasPendingBattleAutoStart`) so the "Exit connection" / "Start battle" buttons
// stay disabled until the PK actually starts. On disconnect, drop both the
// guard and any leftover marker so nothing bleeds into the next connection.
// Mirrors the kit ConnectionPanel.vue's `watch(coHostStatus, ...)`.
watch(coHostStatus, (status) => {
  if (status === CoHostStatus.Connected) {
    if (receiverBattleInvitePending.value) {
      isPendingBattleAsReceiver.value = true;
      receiverBattleInvitePending.value = false;
    }
  } else if (status === CoHostStatus.Disconnected) {
    isPendingBattleAsReceiver.value = false;
    receiverBattleInvitePending.value = false;
  }
});

// ==================== Aggregated battle kickoff ====================
// Fire a single battle for every PK invitee who has accepted, but only once
// the whole invite round has settled (`pendingPkInviteeUserIds` empty: every
// invite landed on accepted / rejected / timeout / cancel) AND every accepter
// has actually finished establishing its cross-room connection (appears in the
// `connected` list). Sending one `needResponse: false` battle to all connected
// accepters avoids the race where the first accepter locks in a 1-on-1 battle
// before the others respond. Mirrors `maybeStartAggregatedBattle` in the kit's
// BattlePanel.vue.
//
// Connection-readiness gate: `requestBattle` only pulls hosts that are ALREADY
// connected into the battle. An "accepted" co-host invite does not guarantee
// the cross-room connection (TRTC join + mixing) is live yet — and that
// handshake is markedly slower on Electron than on Web. Firing the battle the
// moment the round settles therefore drops any accepter that has not connected
// yet, leaving it in plain co-host while the others PK (root cause of the
// cross-end bug). We wait for each accepter's `onCoHostUserJoined` before
// including it, backed by a bounded safety timeout so a never-connecting
// accepter cannot stall the battle forever.
const BATTLE_CONNECTION_READY_TIMEOUT_MS = 10000;
let connectionReadyTimer: ReturnType<typeof setTimeout> | null = null;
// Reactive mirror of "the connection-ready safety timer is armed". `connection-
// ReadyTimer` itself is a plain (non-reactive) handle, so this ref is what the
// `hasPendingBattleAutoStart` computed actually tracks. Kept in lock-step with
// the timer in `clearConnectionReadyTimer` and at the arming site.
const connectionReadyTimerArmed = ref(false);
// Reactive "aggregated requestBattle is in flight" flag. Asserted across the
// clear -> requestBattle -> onBattleStarted hand-off so the child's
// "Start battle" button never briefly re-enables in the gap.
const isFiringAggregatedBattle = ref(false);
function clearConnectionReadyTimer() {
  if (connectionReadyTimer !== null) {
    clearTimeout(connectionReadyTimer);
    connectionReadyTimer = null;
  }
  // Always drop the reactive mirror, even when the timer already fired (its
  // callback nulls `connectionReadyTimer` before calling us), so the auto-start
  // flag cannot stay asserted on a stale armed state.
  connectionReadyTimerArmed.value = false;
}

// Subset of accepters whose cross-room connection is actually established
// (present in the `connected` list). Only these are eligible for the battle.
function getConnectedAccepterIds(): string[] {
  const connectedUserIds = new Set(connected.value.map(user => user.userId));
  return Array.from(acceptedPkInviteeUserIds.value).filter(userId => connectedUserIds.has(userId));
}

// Fire the actual battle for the given accepters and reset round bookkeeping
// (accepted set + safety timer). A no-op when nobody is connected.
async function fireAggregatedBattle(userIdList: string[]) {
  // Assert the in-flight flag BEFORE clearing the round bookkeeping so the
  // auto-start signal stays continuously true across the clear -> requestBattle
  // -> onBattleStarted hand-off (no flicker window where the child's
  // "Start battle" button briefly re-enables).
  isFiringAggregatedBattle.value = true;
  acceptedPkInviteeUserIds.value.clear();
  clearConnectionReadyTimer();
  if (userIdList.length === 0) {
    isFiringAggregatedBattle.value = false;
    return;
  }
  try {
    await requestBattle({
      config: { duration: configForm.value.battleDuration, needResponse: false, extensionInfo: '' },
      userIdList,
      timeout: 0,
    });
    // SUCCESS: deliberately keep `isFiringAggregatedBattle` asserted. The
    // request resolving only means the SDK accepted the call, NOT that the PK
    // has started — `onBattleStarted` (which sets `battleId` and closes the
    // child panel) fires slightly later, and that gap is larger on Electron
    // due to IPC + event round-trips. Clearing the flag here would push a
    // snapshot that re-enables the child's "Start battle" button for that gap,
    // which is exactly the brief un-disabled flicker we are preventing. The
    // flag is instead cleared by `onBattleStarted` / `onBattleEnded` (and the
    // disable-cleanup watch on session boundaries).
  } catch (e) {
    console.warn('[CoHostButton] aggregated auto-battle request failed:', e);
    emitCoHostEvent({ event: 'errorToast', message: t('Request battle failed') });
    // FAILURE: no battle will start, so release the flag now so the child's
    // "Start battle" button becomes clickable again for a manual retry.
    isFiringAggregatedBattle.value = false;
  }
}

async function maybeStartAggregatedBattle() {
  if (pendingPkInviteeUserIds.value.size > 0) return;
  if (acceptedPkInviteeUserIds.value.size === 0) return;
  const connectedAccepterIds = getConnectedAccepterIds();
  // Every accepter is connected → fire immediately for all of them.
  if (connectedAccepterIds.length === acceptedPkInviteeUserIds.value.size) {
    await fireAggregatedBattle(connectedAccepterIds);
    return;
  }
  // Otherwise some accepters are still connecting. Wait for their
  // `onCoHostUserJoined` to re-invoke us, and arm a one-shot safety timeout so
  // a never-connecting accepter cannot stall the battle forever: when it fires
  // we proceed with whoever is connected at that moment.
  if (connectionReadyTimer === null) {
    connectionReadyTimer = setTimeout(() => {
      connectionReadyTimer = null;
      void fireAggregatedBattle(getConnectedAccepterIds());
    }, BATTLE_CONNECTION_READY_TIMEOUT_MS);
    // Mark the reactive mirror so `hasPendingBattleAutoStart` stays asserted
    // while we wait for the remaining accepters to finish connecting.
    connectionReadyTimerArmed.value = true;
  }
}

// ==================== Action handler (child -> main) ====================
async function onCoHostAction(payload: CoHostActionPayload) {
  switch (payload.action) {
  case 'getCandidates':
    try {
      await getCoHostCandidates(payload.cursor);
    } catch (e) {
      console.warn('[CoHostButton] getCoHostCandidates failed:', e);
    }
    break;

  case 'requestConnection': {
    const { liveId, userId, userName, withBattle, timeoutSec } = payload;
    // Ignore a re-entrant action while a request for the same liveId is still
    // in flight (see `pendingRequestConnectionLiveIds`). This silently drops
    // the duplicate so no second SDK call and no error toast are produced.
    if (pendingRequestConnectionLiveIds.value.has(liveId)) {
      break;
    }
    pendingRequestConnectionLiveIds.value.add(liveId);
    // We are now the inviter, not an invitee: drop any stale receiver-side
    // withBattle marker so this outbound connection can never be mistaken for a
    // battle hand-off we were invited into.
    receiverBattleInvitePending.value = false;
    try {
      const result = await requestHostConnection({
        liveId,
        layoutTemplate: effectiveCoHostLayoutTemplate.value,
        timeout: timeoutSec,
        extensionInfo: JSON.stringify({ timeout: timeoutSec, withBattle }),
      });
      const code = result.get(liveId);
      if (code === TUIConnectionCode.TUIConnectionCodeSuccess) {
        if (withBattle) {
          // BattlePanel path: track the invitee so a follow-up
          // requestBattle is fired once the co-host accept event arrives.
          pendingPkInviteeUserIds.value.add(userId);
          emitCoHostEvent({ event: 'battleSentToast', userId, userName });
        } else {
          // ConnectionPanel path: keep an "invitation sent" toast on the child;
          // its close-handle is owned by the child window per userId.
          sentCoHostRequestUserList.value.add(userId);
          emitCoHostEvent({ event: 'connectionSentToast', userId, userName });
        }
      } else {
        const errMsg = (() => {
          switch (code) {
          case TUIConnectionCode.TUIConnectionCodeRoomNotExist:
            return withBattle
              ? t('Send battle request failed, Room not exist')
              : t('Send co-host request failed, Room not exist');
          case TUIConnectionCode.TUIConnectionCodeConnecting:
            return withBattle
              ? t('Send battle request failed, Room is connecting')
              : t('Send co-host request failed, Room is connecting');
          case TUIConnectionCode.TUIConnectionCodeConnectingOtherRoom:
            return withBattle
              ? t('Send battle request failed, Room is connecting other room')
              : t('Send co-host request failed, Room is connecting other room');
          case TUIConnectionCode.TUIConnectionCodeFull:
            return withBattle
              ? t('Send battle request failed, Connected count is full')
              : t('Send co-host request failed, Connected count is full');
          case TUIConnectionCode.TUIConnectionCodeRetry:
            return withBattle
              ? t('Send battle request failed')
              : t('Send co-host request failed');
          default:
            return withBattle ? t('Send battle request failed') : t('Send co-host request failed');
          }
        })();
        emitCoHostEvent({ event: 'errorToast', message: errMsg });
      }
    } catch (e) {
      console.warn('[CoHostButton] requestConnection failed:', e);
      emitCoHostEvent({
        event: 'errorToast',
        message: withBattle ? t('Send battle request failed') : t('Send co-host request failed'),
      });
    } finally {
      // Release the guard once the request settles, allowing a retry on failure
      // (on success the child button is already flipped via the invitees snapshot).
      pendingRequestConnectionLiveIds.value.delete(liveId);
    }
    break;
  }

  case 'cancelConnection': {
    const { liveId, userId } = payload;
    try {
      await cancelHostConnection({ liveId });
    } catch (e) {
      console.warn('[CoHostButton] cancelConnection failed:', e);
      emitCoHostEvent({ event: 'errorToast', message: t('Cancel co-host request failed') });
      return;
    }
    if (sentCoHostRequestUserList.value.delete(userId)) {
      emitCoHostEvent({ event: 'closeSentToast', userId });
    }
    pendingPkInviteeUserIds.value.delete(userId);
    // Cancelling one outstanding invite may settle the round; aggregate the
    // accepters gathered so far.
    void maybeStartAggregatedBattle();
    break;
  }

  case 'acceptConnection':
    // Reserved for inbound co-host application accept. The current child UI
    // does not wire this yet; we keep the action variant for protocol symmetry.
    if (applicant.value?.liveId) {
      try {
        await acceptHostConnection({ liveId: applicant.value.liveId });
      } catch (e) {
        console.warn('[CoHostButton] acceptConnection failed:', e);
      }
    }
    break;

  case 'rejectConnection':
    if (applicant.value?.liveId) {
      try {
        await rejectHostConnection({ liveId: applicant.value.liveId });
      } catch (e) {
        console.warn('[CoHostButton] rejectConnection failed:', e);
      }
    }
    break;

  case 'exitConnection':
    // Authoritative guard mirroring `case 'requestBattle'`: during the
    // two-phase Battle-tab auto-start window (connection established but
    // `onBattleStarted` not yet fired) exiting the connection would tear down
    // the hand-off and abort the PK. The child button is already :disabled on
    // this snapshot flag, but IPC snapshot propagation has a lag; silently drop
    // any `exitConnection` action that slips through during that gap.
    if (hasPendingBattleAutoStart.value) {
      break;
    }
    try {
      // Cancel any still-pending battle invitation (sent via "Start battle"
      // while connected) before leaving the connection. Otherwise a remote
      // invitee could accept the battle after we have exited and be wrongly
      // pushed into the PK state. Mirrors kit ConnectionPanel.handleExitCoHost.
      if (pendingBattleRequestId.value && pendingBattleRequestUserIds.value.size > 0) {
        try {
          await cancelBattleRequest({
            battleId: pendingBattleRequestId.value,
            userIdList: Array.from(pendingBattleRequestUserIds.value),
          });
        } catch (e) {
          console.warn('[CoHostButton] cancelBattleRequest before exitConnection failed:', e);
        }
        pendingBattleRequestId.value = '';
        pendingBattleRequestUserIds.value.clear();
      }
      await exitHostConnection();
      // mutedHosts is auto-pruned by CoHostState.onConnectionUserListChanged
      // when the disconnect event arrives.
    } catch (e) {
      console.warn('[CoHostButton] exitConnection failed:', e);
    }
    break;

  case 'muteRemoteHostAudio': {
    const { liveId, mute } = payload;
    try {
      // muteRemoteHostAudio updates atomic mutedHosts internally;
      // no need to duplicate add/delete here.
      await muteRemoteHostAudio(liveId, mute);
    } catch (e) {
      console.warn('[CoHostButton] muteRemoteHostAudio failed:', e);
      emitCoHostEvent({ event: 'errorToast', message: t('Mute failed') });
    }
    break;
  }

  case 'requestBattle': {
    const { userIdList, battleDuration, timeoutSec } = payload;
    // Authoritative guard: never start a PK while any connection invite is
    // still pending (accept / reject / cancel / timeout not yet settled).
    // Otherwise the host could fire a battle with only the already-connected
    // hosts and a later accepter would be stranded in plain co-host (AB in PK
    // while BC co-host). The child button is already :disabled on the snapshot
    // `hasPendingConnectionInvite`, but the child is a read-only mirror, so the
    // real enforcement lives here where the SDK call happens.
    if (hasPendingConnectionInvite.value) {
      break;
    }
    // Authoritative guard mirroring the child's :disabled state: never fire a
    // manual PK while a Battle-tab-initiated PK is still auto-starting for the
    // same round, otherwise the SDK rejects the duplicate `requestBattle` and a
    // "Request battle failed" toast is shown. The aggregated auto-start fires
    // `requestBattle` directly (not through this action), so this guard does
    // not block it.
    if (hasPendingBattleAutoStart.value) {
      break;
    }
    // Drop a re-entrant action while a previous request is still in flight
    // (see `isRequestingBattle`). This silently ignores the duplicate so no
    // second SDK call and no spurious error toast are produced.
    if (isRequestingBattle.value) {
      break;
    }
    isRequestingBattle.value = true;
    try {
      const battleRes = await requestBattle({
        // Connected hosts auto-join the PK without a per-invitee prompt: the
        // receiver no longer gets `onBattleRequestReceived`, so no accept/reject
        // dialog is shown and the battle starts immediately.
        config: { duration: battleDuration, needResponse: false, extensionInfo: '' },
        userIdList,
        timeout: 0,
      });
      // `battleRes.result` maps each invitee userId to a `TUIBattleCode`. Only
      // treat the request as failed when every invitee failed (none returned
      // `kSuccess`); if at least one invitee succeeded the battle proceeds and
      // no error toast is forwarded to the child window.
      const inviteeResults = (battleRes?.result ?? {}) as Record<string, TUIBattleCode>;
      const resultCodes = Object.values(inviteeResults);
      const allInviteesFailed = resultCodes.length > 0 && resultCodes.every(code => code !== TUIBattleCode.kSuccess);
      if (allInviteesFailed) {
        emitCoHostEvent({ event: 'errorToast', message: t('Request battle failed') });
        // Every invitee failed: release the guard so the host can retry.
        isRequestingBattle.value = false;
      } else {
        pendingBattleRequestId.value = battleRes?.battleId || '';
        // Only track invitees who actually accepted the request (returned
        // `kSuccess`); invitees that failed must not be added to the pending
        // list so the child button only flips to "Cancel battle" for them.
        Object.entries(inviteeResults).forEach(([id, code]) => {
          if (code === TUIBattleCode.kSuccess) {
            pendingBattleRequestUserIds.value.add(id);
          }
        });
        // Success: intentionally keep `isRequestingBattle` asserted. It is
        // released only by `onBattleStarted` / `onBattleEnded` / the session
        // disable-cleanup watch, mirroring `isFiringAggregatedBattle`. This
        // keeps the main-window guard true across the whole
        // `resolve -> onBattleStarted` window (plus the IPC snapshot
        // propagation delay), so a re-entrant `requestBattle` action from the
        // child window is silently dropped by the guard at the top of this
        // case instead of re-issuing the request.
      }
    } catch (error: any) {
      const key = BATTLE_ERROR_MESSAGE[error?.code] || 'Request battle failed';
      emitCoHostEvent({ event: 'errorToast', message: t(key) });
      // Request threw: release the guard so the host can retry.
      isRequestingBattle.value = false;
    }
    break;
  }

  case 'cancelBattleRequest':
    try {
      if (pendingBattleRequestId.value) {
        await cancelBattleRequest({
          battleId: pendingBattleRequestId.value,
          userIdList: Array.from(pendingBattleRequestUserIds.value),
        });
      }
    } catch (e) {
      console.warn('[CoHostButton] cancelBattleRequest failed:', e);
    }
    pendingBattleRequestId.value = '';
    pendingBattleRequestUserIds.value.clear();
    break;

  case 'setConfigForm':
    configForm.value = {
      battleDuration: payload.battleDuration,
      coHostLayoutTemplate: payload.coHostLayoutTemplate,
    };
    break;

  default: {
    // Exhaustiveness guard: any new variant must be handled above.
    const _exhaustive: never = payload;
    void _exhaustive;
  }
  }
}

// ==================== CoHost / Battle event handlers (main window) ====================
// Each handler keeps the local bookkeeping (sentCoHostRequestUserList /
// pendingPkInviteeUserIds / pendingBattleRequestUserIds / pendingBattleRequestId)
// in sync with the kit's authoritative state-layer events, then forwards the
// resulting toast UX to the child via COHOST_EVENT. Mirrors kit BattlePanel
// + ConnectionPanel handlers.

// Receiver-side battle detection: an "Invite battle" arrives on the invitee as
// a plain co-host request whose extensionInfo carries `withBattle: true`.
// Record the marker; it is consumed on the next coHostStatus -> Connected
// transition (see the coHostStatus watcher) to raise `isPendingBattleAsReceiver`.
const handleCoHostRequestReceived = ({ extensionInfo }: { inviter: SeatUserInfo; extensionInfo: string }) => {
  let withBattle = false;
  try {
    withBattle = Boolean(extensionInfo && JSON.parse(extensionInfo)?.withBattle);
  } catch (e) {
    // Malformed extensionInfo: treat it as a plain co-host invite.
  }
  // Latest invite wins: a plain co-host invite must clear a stale PK marker.
  receiverBattleInvitePending.value = withBattle;
};

const handleCoHostRequestAccepted = ({ invitee }: { invitee: SeatUserInfo }) => {
  // Drop from co-host "Invitation sent" tracking (do NOT close the toast — let
  // it finish its own life-cycle since the invite was actually accepted).
  sentCoHostRequestUserList.value.delete(invitee.userId);

  // If this invitee was a battle-invite pivot, move them into the accepted set
  // and try to aggregate. We deliberately do NOT fire the battle right away:
  // waiting until the round settles lets us include every accepter in a single
  // battle.
  if (pendingPkInviteeUserIds.value.delete(invitee.userId)) {
    acceptedPkInviteeUserIds.value.add(invitee.userId);
    void maybeStartAggregatedBattle();
  }
};

const handleCoHostRequestCancelled = ({ inviter }: { inviter: SeatUserInfo }) => {
  // Local user is the cancelled invitee in this case; clean up any pending PK probe.
  pendingPkInviteeUserIds.value.delete(inviter.userId);
  // The withBattle invite was revoked before we accepted it: drop the marker so
  // a later plain co-host connection is not mistaken for a battle hand-off.
  receiverBattleInvitePending.value = false;
};

const handleCoHostRequestRejected = ({ invitee }: { invitee: SeatUserInfo }) => {
  if (sentCoHostRequestUserList.value.delete(invitee.userId)) {
    // Dismiss the just-shown "invitation sent" toast on the child window so
    // the user does not see "sent" and "rejected" toasts at the same time.
    emitCoHostEvent({ event: 'closeSentToast', userId: invitee.userId });
  }
  pendingPkInviteeUserIds.value.delete(invitee.userId);
  // A rejection may settle the round; aggregate the accepters gathered so far.
  void maybeStartAggregatedBattle();
};

const handleCoHostRequestTimeout = ({ inviter, invitee }: { inviter: SeatUserInfo; invitee: SeatUserInfo }) => {
  // Clear the receiver-side marker first, before the inviter-only guard below:
  // a receiver-side timeout (the withBattle invite lapsed before we accepted)
  // fires with `inviter` being the remote host, so this must run regardless of
  // who initiated, otherwise a stale marker could leak into a later plain
  // co-host connection. Clearing it on our own outbound timeout is harmless.
  receiverBattleInvitePending.value = false;
  if (inviter.userId !== loginUserInfo.value?.userId) return;
  if (sentCoHostRequestUserList.value.delete(invitee.userId)) {
    emitCoHostEvent({ event: 'closeSentToast', userId: invitee.userId });
  }
  pendingPkInviteeUserIds.value.delete(invitee.userId);
  // A timeout may settle the round; aggregate the accepters gathered so far.
  void maybeStartAggregatedBattle();
};

// A previously-accepted PK invitee has now finished establishing its
// cross-room connection (it just appeared in `connected`). Re-check whether the
// aggregated battle can fire now that this accepter is connection-ready. No-op
// for joiners that are not part of the current battle round (plain co-host).
const handleCoHostUserJoined = ({ userInfo }: { userInfo: SeatUserInfo }) => {
  if (!acceptedPkInviteeUserIds.value.has(userInfo.userId)) return;
  void maybeStartAggregatedBattle();
};

const onBattleRequestAccept = (eventInfo: { battleId: string; inviter: SeatUserInfo; invitee: SeatUserInfo }) => {
  if (eventInfo.inviter.userId === loginUserInfo.value?.userId) {
    pendingBattleRequestUserIds.value.delete(eventInfo.invitee.userId);
  }
};
const onBattleRequestRejected = (eventInfo: { battleId: string; inviter: SeatUserInfo; invitee: SeatUserInfo }) => {
  if (eventInfo.inviter.userId === loginUserInfo.value?.userId) {
    pendingBattleRequestUserIds.value.delete(eventInfo.invitee.userId);
  }
};
const onBattleRequestTimeout = (eventInfo: { battleId: string; inviter: SeatUserInfo; invitee: SeatUserInfo }) => {
  if (eventInfo.inviter.userId === loginUserInfo.value?.userId) {
    pendingBattleRequestUserIds.value.delete(eventInfo.invitee.userId);
  }
};
const onBattleStarted = () => {
  pendingBattleRequestId.value = '';
  pendingBattleRequestUserIds.value.clear();
  // The auto-start hand-off is complete: the PK has actually started, so drop
  // the in-flight flag that `fireAggregatedBattle` kept asserted across the
  // requestBattle -> onBattleStarted gap (see the SUCCESS note there).
  isFiringAggregatedBattle.value = false;
  // Release the manual "Start battle" guard here too: it is intentionally kept
  // asserted from a successful `requestBattle` until the PK actually starts,
  // closing the `resolve -> onBattleStarted` double-click window.
  isRequestingBattle.value = false;
  // Receiver-side two-phase window is over: the PK has started, so drop the
  // receiver guard (and any leftover marker).
  isPendingBattleAsReceiver.value = false;
  receiverBattleInvitePending.value = false;
};
const onBattleEnded = () => {
  pendingBattleRequestId.value = '';
  pendingBattleRequestUserIds.value.clear();
  // Defensive: never let an in-flight auto-start flag bleed past the battle.
  isFiringAggregatedBattle.value = false;
  // Defensive: never let the manual "Start battle" guard bleed past the battle.
  isRequestingBattle.value = false;
  // Defensive: never let the receiver-side guard/marker bleed past the battle.
  isPendingBattleAsReceiver.value = false;
  receiverBattleInvitePending.value = false;
};

// ==================== HIDE_CHILD_PANEL observer ====================
const onHideChildPanel = (payload: { panelType: ChildPanelType }) => {
  if (payload.panelType === ChildPanelType.CoHostConnection) {
    isCoHostChildOpen.value = false;
  }
};

// ==================== Child-panel candidate freshness ====================
// Win mode only: the child window is a read-only mirror of the snapshot the
// main window pushes. The kit panel's own visibility/disconnect watches
// (uikit-component-vue3-electron `CoHostPanel.vue`) cannot run there, so we
// reproduce the same two refresh triggers here at the main-window owner of
// the candidates list. Once `getCoHostCandidates('')` resolves, the existing
// snapshot-push watch below picks up the `candidates` change and forwards a
// fresh `UPDATE_CHILD_DATA` payload to the child renderer.
//
// Trigger 1: child panel transitions from closed to open. Without this,
// reopening keeps a stale snapshot — for example, a host whose connection
// was just ended would not reappear in "Recommend hosts".
//
// Side-effect note: passing '' resets the candidates pagination cursor in
// the kit store. If the user had paged past the first screen in the child
// panel before closing it, that scroll position is discarded on reopen —
// we trade scroll retention for "just-disconnected host shows up at the
// top", which is the higher-priority UX here.
watch(isCoHostChildOpen, (open) => {
  if (!props.isShowingInChildWindow || !open) return;
  getCoHostCandidates('').catch((error) => {
    console.warn('[CoHostButton] refresh candidates on child open failed', error);
  });
});

// Trigger 2: connected list shrinks while child panel is open. The kit's
// `handleConnectionUserListChanged` only filters joiners out of candidates
// and never adds disconnected hosts back, so we pull a fresh page so the
// just-left host can be re-invited without manual refresh. Gated on
// `isCoHostChildOpen` to avoid burning SDK rate-limit budget while the
// panel is closed (Win-only path; Mac mode runs the kit panel directly).
//
// Edge case: this only fires on a net length decrease. A same-tick join+leave
// (e.g. SDK batches `connectionUserListChanged` with both add and remove in
// one event) leaves `connected.length` unchanged and the watcher is silent.
// Acceptable trade-off — the child panel's manual refresh button is the
// fallback for this rare case. If misses become noticeable in production,
// switch to `watch(connected, …, { deep: true })` with a Set diff against
// previous user ids to detect leavers regardless of net length.
watch(() => connected.value.length, (newCount, oldCount) => {
  if (!props.isShowingInChildWindow || !isCoHostChildOpen.value) return;
  if (newCount >= oldCount) return;
  getCoHostCandidates('').catch((error) => {
    console.warn('[CoHostButton] refresh candidates after disconnect failed', error);
  });
});

// ==================== State -> snapshot push wiring ====================
// Deep-watch reactive sources whose nested fields the child UI reads. This is
// cheap because pushSnapshot is a no-op when the child window is closed.
// Aggregating into a single watch avoids duplicate snapshot pushes when
// multiple sources mutate together (e.g. accept event flips both `connected`
// and `invitees`).
watch(
  [
    coHostStatus,
    connected,
    invitees,
    candidates,
    candidatesCursor,
    applicant,
    mutedHosts,
    () => currentBattleInfo.value?.battleId || '',
    battleUsers,
    battleScore,
    pendingBattleRequestUserIds,
    pendingBattleRequestId,
    pendingPkInviteeUserIds,
    // Drives `hasPendingBattleAutoStart` in the snapshot; include the computed
    // so any change to its underlying sources (accepted set / connection-ready
    // timer / in-flight battle) pushes a fresh snapshot to keep the child's
    // "Start battle" disabled state in sync.
    hasPendingBattleAutoStart,
    // Connection invite pending set: drives `hasPendingConnectionInvite` in the
    // snapshot, so its changes must trigger a push to keep the child's invite
    // mutual-exclusion disabled state in sync.
    sentCoHostRequestUserList,
    configForm,
    () => loginUserInfo.value,
    () => currentLive.value,
  ],
  () => pushSnapshot(),
  { deep: true },
);

// ==================== Lifecycle ====================
onMounted(() => {
  if (props.isShowingInChildWindow) {
    ipcBridge.on(IPCMessageType.COHOST_ACTION, onCoHostAction);
    ipcBridge.on(IPCMessageType.HIDE_CHILD_PANEL, onHideChildPanel);
  }
  subscribeCoHostEvent(CoHostEvent.onCoHostRequestAccepted, handleCoHostRequestAccepted);
  subscribeCoHostEvent(CoHostEvent.onCoHostRequestCancelled, handleCoHostRequestCancelled);
  subscribeCoHostEvent(CoHostEvent.onCoHostRequestRejected, handleCoHostRequestRejected);
  subscribeCoHostEvent(CoHostEvent.onCoHostRequestTimeout, handleCoHostRequestTimeout);
  subscribeCoHostEvent(CoHostEvent.onCoHostRequestReceived, handleCoHostRequestReceived);
  subscribeCoHostEvent(CoHostEvent.onCoHostUserJoined, handleCoHostUserJoined);

  subscribeBattleEvent(BattleEvent.onBattleRequestAccept, onBattleRequestAccept);
  subscribeBattleEvent(BattleEvent.onBattleRequestReject, onBattleRequestRejected);
  subscribeBattleEvent(BattleEvent.onBattleRequestTimeout, onBattleRequestTimeout);
  subscribeBattleEvent(BattleEvent.onBattleStarted, onBattleStarted);
  subscribeBattleEvent(BattleEvent.onBattleEnded, onBattleEnded);
});

onBeforeUnmount(() => {
  if (props.isShowingInChildWindow) {
    ipcBridge.off(IPCMessageType.COHOST_ACTION, onCoHostAction);
    ipcBridge.off(IPCMessageType.HIDE_CHILD_PANEL, onHideChildPanel);
  }
  unsubscribeCoHostEvent(CoHostEvent.onCoHostRequestAccepted, handleCoHostRequestAccepted);
  unsubscribeCoHostEvent(CoHostEvent.onCoHostRequestCancelled, handleCoHostRequestCancelled);
  unsubscribeCoHostEvent(CoHostEvent.onCoHostRequestRejected, handleCoHostRequestRejected);
  unsubscribeCoHostEvent(CoHostEvent.onCoHostRequestTimeout, handleCoHostRequestTimeout);
  unsubscribeCoHostEvent(CoHostEvent.onCoHostRequestReceived, handleCoHostRequestReceived);
  unsubscribeCoHostEvent(CoHostEvent.onCoHostUserJoined, handleCoHostUserJoined);
  // Drop any armed battle connection-readiness timer so it cannot fire after teardown.
  clearConnectionReadyTimer();

  unsubscribeBattleEvent(BattleEvent.onBattleRequestAccept, onBattleRequestAccept);
  unsubscribeBattleEvent(BattleEvent.onBattleRequestReject, onBattleRequestRejected);
  unsubscribeBattleEvent(BattleEvent.onBattleRequestTimeout, onBattleRequestTimeout);
  unsubscribeBattleEvent(BattleEvent.onBattleStarted, onBattleStarted);
  unsubscribeBattleEvent(BattleEvent.onBattleEnded, onBattleEnded);
});

</script>

<style lang="scss" scoped>
@import '../assets/mac.scss';

.custom-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 56px;
  width: auto;
  height: 56px;
  cursor: pointer;
  color: $text-color1;
  border-radius: 12px;
  position: relative;

  .unread-count {
    position: absolute;
    top: 0;
    right: 0;
    background-color: var(--text-color-error);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .custom-icon {
    @include icon-size-24;
    background: transparent;
  }
  .custom-text {
    @include text-size-12;
  }

  &:not(.disabled):hover {
    box-shadow: 0 0 10px 0 var(--bg-color-mask);
    .custom-icon {
      color: $icon-hover-color;
    }
    .custom-text {
      color: $icon-hover-color;
    }
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    color: $text-color3;
    .custom-icon {
      cursor: not-allowed;
    }
    .custom-text {
      color: $text-color3;
    }
  }
}
</style>
