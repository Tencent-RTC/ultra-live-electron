<template>
  <TUIDialog
    :visible="true"
    width="100%"
    @close="handleClose"
    :title="title"
    :customClasses="dialogCustomClasses"
  >
    <div class="camera-dialog-body">
      <!-- Left tab nav -->
      <div class="tab-nav">
        <button
          v-for="tab in tabList"
          :key="tab.key"
          type="button"
          class="tab-nav-btn"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- Right content -->
      <div class="tab-content">
        <!--
          License hint: when the Tencent Effect (xmagic) license is not
          configured the beauty tabs cannot take effect. Surface a clickable
          tip (only on beauty tabs, i.e. not on "basic") that opens the SDK
          activation doc in the system browser.
        -->
        <button
          v-if="!beautyLicenseConfigured && activeTab !== 'basic'"
          type="button"
          class="license-tip"
          @click="openBeautyLicenseDoc"
        >{{ t('The beauty feature requires enabling the Tencent Effect SDK') }}</button>

        <!-- (1) Basic settings — always rendered; activeTab gates visibility. -->
        <BasicSettingTab
          v-show="activeTab === 'basic'"
          :camera-list="cameraList"
          :model-value-camera="currentCameraId"
          :model-value-resolution="currentResolution"
          :resolution-list="videoResolutionList"
          :is-camera-option-disabled="isCameraOptionDisabled"
          :camera-select-disabled="cameraOpPending"
          @update:camera="onPickCamera"
          @update:resolution="onPickResolution"
        />

        <!--
          Beauty tabs: gated as a single block on `effectConstantRef`. Wrapping
          here avoids per-child `v-if` flipping during the brief window between
          dialog mount and the first SHOW_CHILD_PANEL message that delivers the
          constant. Per-child `v-if` checks for individual group existence are
          kept (SDK theoretically may omit a group), but they are guaranteed
          to resolve consistently within this block.
        -->
        <template v-if="effectConstantRef">
          <!--
            (2) Intensity tabs. Each category now has its OWN independent
            component (no cross-category reuse) so they can diverge freely;
            they share only the IntensityRow / GroupSwitch atoms internally.
          -->
          <BeautyTab
            v-if="effectConstantRef.beauty"
            v-show="activeTab === 'beauty'"
            :group-label="resolveLabel(effectConstantRef.beauty)"
            :items="effectConstantRef.beauty.details || []"
            :enabled="!!groupEnabled.beauty"
            @intensity-change="onIntensityChange"
            @toggle-enabled="onToggleEnabled"
          />
          <ImageQualityTab
            v-if="effectConstantRef.imageQuality"
            v-show="activeTab === 'imageQuality'"
            :group-label="resolveLabel(effectConstantRef.imageQuality)"
            :items="effectConstantRef.imageQuality.details || []"
            :enabled="!!groupEnabled.imageQuality"
            @intensity-change="onIntensityChange"
            @toggle-enabled="onToggleEnabled"
          />
          <AdvancedBeautyTab
            v-if="effectConstantRef.advancedBeauty"
            v-show="activeTab === 'advancedBeauty'"
            :group-label="resolveLabel(effectConstantRef.advancedBeauty)"
            :items="effectConstantRef.advancedBeauty.details || []"
            :enabled="!!groupEnabled.advancedBeauty"
            @intensity-change="onIntensityChange"
            @toggle-enabled="onToggleEnabled"
          />
          <BodyBeautyTab
            v-if="effectConstantRef.bodyBeauty"
            v-show="activeTab === 'bodyBeauty'"
            :group-label="resolveLabel(effectConstantRef.bodyBeauty)"
            :items="effectConstantRef.bodyBeauty.details || []"
            :enabled="!!groupEnabled.bodyBeauty"
            @intensity-change="onIntensityChange"
            @toggle-enabled="onToggleEnabled"
          />

          <!-- (3) Beauty template: preset pick that expands to multiple effects. -->
          <BeautyTemplateTab
            v-if="effectConstantRef.beautyTemplate"
            v-show="activeTab === 'beautyTemplate'"
            :items="effectConstantRef.beautyTemplate.details || []"
            @pick="onPickBeautyTemplate"
          />

          <!-- (4) Studio makeup: pick + intensity. -->
          <AdvancedMakeupTab
            v-if="effectConstantRef.advancedMakeup"
            v-show="activeTab === 'advancedMakeup'"
            :items="effectConstantRef.advancedMakeup.details || []"
            @pick="onPickAdvancedMakeup"
            @intensity-change="onIntensityChange"
          />

          <!-- (5) Light makeup: pick + overall strength + filter strength. -->
          <LightMakeupTab
            v-if="effectConstantRef.lightMakeup"
            v-show="activeTab === 'lightMakeup'"
            :items="effectConstantRef.lightMakeup.details || []"
            @pick="onPickLightMakeup"
            @intensity-change="onIntensityChange"
            @lut-strength-change="onLightMakeupLutStrength"
          />

          <!-- (6) Point makeup: per-part color-card pick + per-option strength. -->
          <PointMakeupTab
            v-if="effectConstantRef.makeup"
            v-show="activeTab === 'makeup'"
            :parts="effectConstantRef.makeup.details || []"
            @pick="onPickMakeupPart"
            @intensity-change="onMakeupIntensity"
          />

          <!-- (7) Lut / filter: pick + intensity. -->
          <LutTab
            v-if="effectConstantRef.lut"
            v-show="activeTab === 'lut'"
            :items="effectConstantRef.lut.details || []"
            @pick="onPickLut"
            @intensity-change="onIntensityChange"
          />

          <!-- (8) Motion: pick only with 2D/3D/Hand sub-groups. -->
          <MotionTab
            v-if="effectConstantRef.motion"
            v-show="activeTab === 'motion'"
            :sub-groups="effectConstantRef.motion.details || []"
            @pick="onPickMotion"
          />

          <!-- (9) Segment / virtual background: pick only (wide tiles). -->
          <SegmentTab
            v-if="effectConstantRef.segment"
            v-show="activeTab === 'segment'"
            :items="effectConstantRef.segment.details || []"
            @pick="onPickSegment"
          />
        </template>
      </div>

      <!-- Floating top-right "reset all" button:
           replaced by per-tab switches (GroupSwitch) in the header of every
           beauty tab. Toggling a switch off clears that group; toggling all
           groups off is the equivalent of "reset all", with a clearer mental
           model that maps to the visible state of the dialog. -->
    </div>
    <!-- Empty footer slot replaces the default Cancel/Confirm buttons. -->
    <template #footer><span class="footer-spacer" /></template>
  </TUIDialog>
</template>

<script setup lang="ts">
import { ref, shallowRef, Ref, computed, watch, onMounted } from 'vue';
import { shell } from 'electron';
import { useDeviceState } from 'tuikit-atomicx-vue3-electron';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import {
  TRTCVideoMirrorType,
  TRTCMediaSourceType,
} from '@tencentcloud/tuiroom-engine-electron';
import { TUIDialog, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import { useDialogClasses } from '../../../hooks/useDialogClasses';
import BasicSettingTab from './BasicSettingTab.vue';
import BeautyTab from './BeautyTab.vue';
import ImageQualityTab from './ImageQualityTab.vue';
import AdvancedBeautyTab from './AdvancedBeautyTab.vue';
import BodyBeautyTab from './BodyBeautyTab.vue';
import BeautyTemplateTab from './BeautyTemplateTab.vue';
import AdvancedMakeupTab from './AdvancedMakeupTab.vue';
import LightMakeupTab from './LightMakeupTab.vue';
import PointMakeupTab from './PointMakeupTab.vue';
import LutTab from './LutTab.vue';
import MotionTab from './MotionTab.vue';
import SegmentTab from './SegmentTab.vue';
import { createEffectStore, type EffectStore, type EffectProperty } from './effectStore';
import { useEffectLabel } from './useEffectLabel';
import { isBeautyLicenseConfigured } from '../../../utils/beauty';

/* eslint-disable @typescript-eslint/no-explicit-any */

const { t } = useUIKit();
const resolveLabel = useEffectLabel();
const { cameraList, getCameraList } = useDeviceState();

/** Tencent Effect SDK activation doc, opened from the license hint. */
const BEAUTY_LICENSE_DOC_URL = 'https://cloud.tencent.com/document/product/616/36807';

// Whether the xmagic license is configured. Read once at setup — the license
// is a build-time constant, so it never changes during the dialog's lifetime.
const beautyLicenseConfigured = isBeautyLicenseConfigured();

/** Open the Tencent Effect SDK activation doc in the system browser. */
const openBeautyLicenseDoc = () => {
  void shell.openExternal(BEAUTY_LICENSE_DOC_URL);
};

const props = withDefaults(defineProps<{
  mediaSource: MediaSource | null;
  /**
   * Camera deviceIds already present in the main window's media source list.
   */
  usedCameraIds?: string[];
  /**
   * Effect constant produced by `getEffectConstant(custom, history)` on the
   * main window. In edit mode the historical effValue / isSelected are
   * already merged. `null` until the main window's prewarm completes — in
   * that brief window the beauty tabs are hidden.
   */
  effectConstant?: Record<string, any> | null;
  /**
   * True while the main window is still applying the previous camera add /
   * switch. The camera dropdown is disabled during this window so the user
   * cannot fire another out-of-order pick until the previous op settles.
   */
  cameraOpPending?: boolean;
  customClasses?: string;
}>(), {
  usedCameraIds: () => [],
  effectConstant: null,
  cameraOpPending: false,
});

const emits = defineEmits<{
  (e: 'addCameraMaterial', payload: Record<string, unknown>): void;
  (e: 'updateCameraMaterial', oldSource: Record<string, unknown>, next: Record<string, unknown>): void;
  /**
   * Beauty effect change for this camera. `properties` is the full deduped
   * snapshot (used for the main-window per-camera cache + migration); `delta`
   * is the incremental set to push to the native plugin this tick. `delta` is
   * omitted for a forced FULL apply (e.g. camera switch), signalling startEffect.
   * `selectedTemplateKey` is the picked beautyTemplate tile's stable identity
   * (null when none), persisted per camera so edit mode restores the template
   * highlight by identity instead of reverse-matching drifted effValues.
   */
  (e: 'beautyChange', payload: { cameraId: string; properties: EffectProperty[]; delta?: EffectProperty[]; selectedTemplateKey?: string | null }): void;
  (e: 'close'): void;
}>();

const dialogCustomClasses = useDialogClasses('camera-setting-dialog', () => props.customClasses);

const title = computed(() => (props.mediaSource ? t('Update Camera') : t('Add Camera')));

// =====================================================================
// Tab navigation
// =====================================================================

/**
 * Strength-class group keys. Each now renders via its own dedicated tab
 * component (BeautyTab / ImageQualityTab / AdvancedBeautyTab / BodyBeautyTab);
 * this list is kept only as the whitelist + TabKey union source.
 */
const INTENSITY_GROUP_KEYS = ['beauty', 'imageQuality', 'advancedBeauty', 'bodyBeauty'] as const;

type TabKey =
  | 'basic'
  | typeof INTENSITY_GROUP_KEYS[number]
  | 'advancedMakeup'
  | 'lightMakeup'
  | 'makeup'
  | 'beautyTemplate'
  | 'lut'
  | 'motion'
  | 'segment';

const activeTab = ref<TabKey>('basic');

/**
 * Beauty group keys we know how to render. Used only as a whitelist filter;
 * the actual tab ORDER comes from the natural key order of the effectConstant
 * (see tabList), so unknown keys are simply skipped rather than reordered.
 */
const RENDERABLE_KEYS = new Set<string>([
  ...INTENSITY_GROUP_KEYS,
  'beautyTemplate',
  'advancedMakeup',
  'lightMakeup',
  'makeup',
  'lut',
  'motion',
  'segment',
]);

const tabList = computed<Array<{ key: TabKey; label: string }>>(() => {
  const list: Array<{ key: TabKey; label: string }> = [{ key: 'basic', label: t('Basic settings') }];
  const ec = effectConstantRef.value;
  if (!ec) return list;
  // Follow the natural key order returned by `getEffectConstant()`. The plugin
  // builds that object strictly in `beauty_level_config.json` order (e.g. for
  // S1-04: beautyTemplate -> beauty -> imageQuality -> lut -> advancedBeauty ->
  // advancedMakeup -> lightMakeup -> makeup -> motion -> segment), so the tab
  // order automatically matches the configured order and adapts to beautyLevel
  // changes without code edits. Only keys we can render are surfaced.
  for (const key of Object.keys(ec)) {
    if (RENDERABLE_KEYS.has(key) && ec[key]) {
      list.push({ key: key as TabKey, label: resolveLabel(ec[key]) });
    }
  }
  return list;
});

// =====================================================================
// Basic settings (camera + resolution): inherits the realtime-edit pattern
// from the previous CameraSettingDialog.vue. All change paths emit ADD on
// first ready and UPDATE on subsequent edits.
// =====================================================================

const currentCameraId = ref(props.mediaSource?.sourceId || '');
const currentResolution = ref('');
const isMirror: Ref<boolean> = ref(
  props.mediaSource ? props.mediaSource.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable : false,
);

const committedSource = ref<Record<string, any> | null>(props.mediaSource ? { ...props.mediaSource } : null);
const started = ref(false);

const DEFAULT_RESOLUTION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '1920x1080', value: '1920x1080' },
  { label: '1280x720', value: '1280x720' },
  { label: '960x540', value: '960x540' },
  { label: '640x360', value: '640x360' },
];

const videoResolutionList = computed<Array<{ label: string; value: string }>>(() => {
  const currentCamera = cameraList.value.find((item) => item.deviceId === currentCameraId.value);
  const supportedResolutions = (currentCamera as any)?.deviceProperties?.SupportedResolution;
  if (Array.isArray(supportedResolutions) && supportedResolutions.length > 0) {
    return supportedResolutions.map((r: { width: number; height: number }) => ({
      label: `${r.width}x${r.height}`,
      value: `${r.width}x${r.height}`,
    }));
  }
  return [...DEFAULT_RESOLUTION_OPTIONS];
});

const disabledCameraIdSet = computed<Set<string>>(() => {
  const editingId = props.mediaSource?.sourceId;
  return new Set((props.usedCameraIds || []).filter((id) => id !== editingId).map(String));
});
const isCameraOptionDisabled = (deviceId: string) => disabledCameraIdSet.value.has(String(deviceId));

const firstAvailableCameraId = computed<string>(() => {
  const c = cameraList.value.find((item) => !disabledCameraIdSet.value.has(String(item.deviceId)));
  return c?.deviceId ?? '';
});

watch(videoResolutionList, (newList) => {
  if (newList.length === 0) return;
  if (!newList.some((item) => item.value === currentResolution.value)) {
    currentResolution.value = newList[0].value;
  }
}, { flush: 'post' });

watch(() => cameraList.value, async () => {
  if (!cameraList.value.find((item) => item.deviceId === currentCameraId.value)) {
    currentCameraId.value = firstAvailableCameraId.value;
  }
});

function buildCameraPayload(): Record<string, any> | null {
  const cameraId = currentCameraId.value;
  if (!cameraId) return null;
  const [width, height] = currentResolution.value.split('x').map(Number);
  if (!width || !height || isNaN(width) || isNaN(height)) {
    console.warn('Invalid resolution value:', currentResolution.value);
    return null;
  }
  return {
    sourceId: cameraId,
    sourceType: TRTCMediaSourceType.kCamera,
    name: cameraList.value.find((item) => item.deviceId === cameraId)?.deviceName,
    width,
    height,
    rect: { left: 0, top: 0, right: width, bottom: height },
    mirrorType: isMirror.value
      ? TRTCVideoMirrorType.TRTCVideoMirrorType_Enable
      : TRTCVideoMirrorType.TRTCVideoMirrorType_Disable,
  };
}

function buildUpdatePayload(): { predata: Record<string, any>; next: Record<string, any> } | null {
  const committed = committedSource.value;
  if (!committed) return null;
  const next = buildCameraPayload();
  if (!next) return null;

  const previousName = committed.name;
  const previousCameraDeviceName = cameraList.value.find((item) => item.deviceId === committed.sourceId)?.deviceName;
  const hasCameraNameChanged = previousName !== previousCameraDeviceName;

  const updateCameraInfo: Record<string, any> = {
    ...committed,
    sourceId: next.sourceId,
    width: next.width,
    height: next.height,
    mirrorType: next.mirrorType,
  };
  if (!hasCameraNameChanged) updateCameraInfo.name = next.name;
  return { predata: committed, next: updateCameraInfo };
}

function commitAdd() {
  const payload = buildCameraPayload();
  if (!payload) return;
  emits('addCameraMaterial', payload);
  committedSource.value = { ...payload };
}

function commitUpdate() {
  const payload = buildUpdatePayload();
  if (!payload) return;
  emits('updateCameraMaterial', payload.predata, payload.next);
  committedSource.value = { ...payload.next };
}

const onPickCamera = (val: string) => {
  currentCameraId.value = val;
  // Reset resolution to the new camera's first supported entry. The change
  // will be picked up by the realtime-sync watch below.
  currentResolution.value = videoResolutionList.value[0]?.value || '';
  // The deviceId switch implies the beauty effects also need to be reapplied
  // on the new camera. Re-emit a beauty snapshot keyed by the new id.
  reEmitBeautyForCurrentCamera();
};

const onPickResolution = (val: string) => {
  currentResolution.value = val;
};

watch(
  [currentCameraId, currentResolution, isMirror],
  () => {
    if (!started.value) return;
    if (!committedSource.value) return;
    commitUpdate();
  },
  { flush: 'post' },
);

watch(
  () => props.mediaSource,
  async (mediaSource: MediaSource | null) => {
    if (mediaSource) {
      if (currentCameraId.value !== mediaSource.sourceId) {
        currentCameraId.value = mediaSource.sourceId;
      }
      if (mediaSource.width !== undefined && mediaSource.height !== undefined) {
        currentResolution.value = `${mediaSource.width}x${mediaSource.height}`;
      }
      isMirror.value = mediaSource.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;
      committedSource.value = { ...mediaSource };
    }
  },
  { deep: true },
);

const handleClose = () => emits('close');

onMounted(async () => {
  if (cameraList.value.length === 0) await getCameraList();
  if (props.mediaSource?.sourceId) {
    currentCameraId.value = props.mediaSource.sourceId;
    if (props.mediaSource.width !== undefined && props.mediaSource.height !== undefined) {
      currentResolution.value = `${props.mediaSource.width}x${props.mediaSource.height}`;
    } else if (videoResolutionList.value.length > 0) {
      currentResolution.value = videoResolutionList.value[0].value;
    }
    isMirror.value = props.mediaSource.mirrorType === TRTCVideoMirrorType.TRTCVideoMirrorType_Enable;
  } else {
    const initialCameraId = firstAvailableCameraId.value;
    if (initialCameraId) {
      currentCameraId.value = initialCameraId;
      currentResolution.value = videoResolutionList.value[0]?.value || '';
      isMirror.value = false;
      commitAdd();
    }
  }
  started.value = true;
});

// =====================================================================
// Beauty effect store wiring
// =====================================================================

// Use shallowRef to keep the EffectStore object itself non-reactive at the
// outer level. If we used a regular `ref`, Vue would deep-reactify the store
// object and auto-unwrap its internal `effectConstant` Ref when accessed via
// `store.value.effectConstant` — so the extra `.value` below would yield
// `undefined`. The store's own internal `constantRef` is still reactive and
// drives template updates via the computed below.
const store = shallowRef<EffectStore | null>(null);

const effectConstantRef = computed(() => store.value?.effectConstant.value ?? null);

/**
 * Per-group enabled state. Each beauty tab renders a switch that toggles its
 * key here; all controls inside the tab are inert when its key is falsy.
 * Default behavior: every group starts off (false), so the user must opt-in
 * before any beauty effect is applied. Edit mode flips relevant keys to true
 * via `deriveInitialGroupEnabled` once the store is created.
 *
 * Declared BEFORE the immediate-watch below so the synchronous initial run
 * of that watch can write to it without hitting the TDZ.
 */
const groupEnabled = ref<Record<string, boolean>>({});

/**
 * Walk the effectConstant tree once and decide which groups should appear
 * enabled on dialog open. A group is "active" if any of its details has been
 * modified from xmagic's universal default (effValue === 0) or has
 * `isSelected: true` (pick-class items).
 *
 * NOTE: we explicitly compare against 0, NOT `minValue`. xmagic always
 * initializes `effValue` to 0 regardless of the slider's min/max range
 * (e.g. -100..100 for image quality / advanced beauty). Comparing against
 * minValue would mark every -100..100 item as active on dialog open even
 * though the user never touched anything.
 */
function deriveInitialGroupEnabled(ec: Record<string, any>): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  const isItemActive = (it: Record<string, any>) => {
    if (it?.isSelected) return true;
    if (typeof it?.effValue === 'number' && it.effValue !== 0) return true;
    return false;
  };
  for (const [key, group] of Object.entries(ec) as Array<[string, any]>) {
    if (!group) continue;
    if (key === 'motion') {
      // Motion has 2D/3D/Hand sub-groups one level deeper.
      const sub = group?.details;
      if (Array.isArray(sub) && sub.some((sg: any) => Array.isArray(sg?.details) && sg.details.some(isItemActive))) {
        result[key] = true;
      }
      continue;
    }
    const items = group?.details;
    if (Array.isArray(items) && items.some(isItemActive)) {
      result[key] = true;
    }
  }
  return result;
}

/**
 * (Re)create the beauty store whenever the parent supplies a new effectConstant.
 * Triggered: (a) initial mount when the prop is non-null, (b) the very rare
 * case the parent updates the prop after open (currently ChildView pushes once).
 *
 * Also seeds `groupEnabled` from the freshly-built constant: any group whose
 * details show user-applied state (non-default effValue OR isSelected) is
 * marked enabled, so the edit-mode dialog reflects what is currently active
 * without forcing the user to flip the switch first.
 */
watch(
  () => props.effectConstant,
  (next) => {
    if (!next) {
      store.value = null;
      groupEnabled.value = {};
      return;
    }
    store.value = createEffectStore({
      effectConstant: next,
      onChange: (delta, full) => {
        const cameraId = currentCameraId.value;
        if (!cameraId) return;
        // Carry the picked template's stable identity alongside the property
        // snapshot so the main window can persist it per camera (see effectStore
        // .getSelectedTemplateKey). `store.value` is set by the time this RAF-
        // throttled callback fires. null means "no template selected".
        emits('beautyChange', {
          cameraId,
          properties: full,
          delta,
          selectedTemplateKey: store.value?.getSelectedTemplateKey() ?? null,
        });
      },
    });
    // Initial enabled state per group: on iff the group has any active item.
    // We read from `store.value.effectConstant.value` (the cloned tree) rather
    // than `next` so this stays in sync with what the store seeded.
    const ec = store.value.effectConstant.value;
    groupEnabled.value = ec ? deriveInitialGroupEnabled(ec) : {};
  },
  { immediate: true },
);

const onIntensityChange = (detail: Record<string, any>, value: number) => {
  store.value?.setIntensity(detail, value);
};

// Pick handlers route to the store keyed by the top-level groupKey (a string).
// Keying by groupKey — not by numeric effect category — is required because
// several groups share one category (advancedMakeup / lightMakeup are both
// Makeup), which a category key could not tell apart.
const onPickAdvancedMakeup = (detail: Record<string, any> | null) => {
  store.value?.pickItem('advancedMakeup', detail);
};

const onPickLightMakeup = (detail: Record<string, any> | null) => {
  store.value?.pickItem('lightMakeup', detail);
};

const onPickBeautyTemplate = (detail: Record<string, any> | null) => {
  store.value?.pickItem('beautyTemplate', detail);
  // Picking a template expands it into the beauty / imageQuality / advancedBeauty
  // intensity groups (effectStore.applyTemplateEffects). Recompute those tabs'
  // enabled state from the freshly-mutated tree so their switches + sliders
  // reflect the preset live — mirroring what edit-mode back-fill already does,
  // and clearing them when the template is switched / removed.
  syncIntensityGroupEnabledFromTree();
};

const onPickLut = (detail: Record<string, any> | null) => {
  store.value?.pickItem('lut', detail);
};

const onPickMotion = (detail: Record<string, any> | null) => {
  store.value?.pickItem('motion', detail);
};

const onPickSegment = (detail: Record<string, any> | null) => {
  store.value?.pickItem('segment', detail);
};

// Point makeup: each part selects/clears its own color-card option, and a
// selected option's strength is adjusted independently.
const onPickMakeupPart = (partKey: string, option: Record<string, any> | null) => {
  store.value?.pickMakeupOption(partKey, option);
};

const onMakeupIntensity = (option: Record<string, any>, value: number) => {
  store.value?.setMakeupIntensity(option, value);
};

// Light makeup carries a second, filter(lut)-only strength alongside its overall
// strength. The picked preset is the mutation target; the store persists it as
// `lutStrength` and surfaces it to native as `makeupLutStrength`.
const onLightMakeupLutStrength = (detail: Record<string, any>, value: number) => {
  store.value?.setMakeupLutStrength(detail, value);
};

/**
 * Group switch toggled. Flipping ON merely unlocks the controls and does not
 * touch the store (no effect is applied until the user picks/drags). Flipping
 * OFF wipes the group's state so the camera reflects "no effect" immediately,
 * matching the reset-button semantics this switch replaces.
 */
const onToggleEnabled = (groupKey: string, enabled: boolean) => {
  groupEnabled.value = { ...groupEnabled.value, [groupKey]: enabled };
  if (!enabled) {
    store.value?.clearCategory(groupKey);
  }
};

/**
 * Recompute the enabled state of the intensity groups (beauty / imageQuality /
 * advancedBeauty / bodyBeauty) from the current effect tree. Called after a
 * beautyTemplate pick, which the store expands into those groups' details: a
 * group becomes enabled iff it now has an active item (non-zero effValue), and
 * is turned off if the template switch/clear left it empty. Only the intensity
 * groups are recomputed here so pick-class groups' state is untouched.
 */
function syncIntensityGroupEnabledFromTree() {
  const ec = store.value?.effectConstant.value;
  if (!ec) return;
  const derived = deriveInitialGroupEnabled(ec);
  const next = { ...groupEnabled.value };
  for (const key of INTENSITY_GROUP_KEYS) {
    next[key] = !!derived[key];
  }
  groupEnabled.value = next;
}

/**
 * After the user switches camera, the beauty effects (already cached for the
 * old cameraId on the main window) need to be applied to the *new* cameraId.
 * We don't have access to the cached properties here in the child window, so
 * we re-emit the current effectStore's full snapshot keyed by the new id.
 * This handles the common case where the user is editing a fresh camera that
 * has no prior beauty (snapshot may be empty); the main window's migration
 * logic in onUpdateMediaSource handles the case where the old camera DID have
 * effects (those properties are migrated server-side).
 */
function reEmitBeautyForCurrentCamera() {
  const s = store.value;
  if (!s) return;
  const cameraId = currentCameraId.value;
  if (!cameraId) return;
  // Forced FULL apply on the new camera (no `delta`): the new deviceId starts
  // with no native effects, so push the complete snapshot (main side runs
  // startEffect). Then rebase the incremental baseline so subsequent deltas are
  // computed against what is now applied on the new camera.
  const full = s.getProperties();
  emits('beautyChange', { cameraId, properties: full, selectedTemplateKey: s.getSelectedTemplateKey() });
  s.markBaseline(full);
}
</script>

<style lang="scss" scoped>
:deep(.camera-setting-dialog) {
  .tui-dialog-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    min-height: 0;
  }
  .tui-dialog-header {
    flex-shrink: 0;
  }
  .tui-dialog-footer {
    display: none;
  }
}

.footer-spacer {
  display: none;
}

.camera-dialog-body {
  position: relative;
  flex: 1;
  display: flex;
  height: 100%;
  min-height: 0;
}

.tab-nav {
  flex: 0 0 140px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--stroke-color-module);
  padding: 8px 0;
  overflow-y: auto;
}

.tab-nav-btn {
  position: relative;
  background: none;
  border: none;
  text-align: left;
  padding: 10px 16px;
  color: var(--text-color-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover:not(.is-active) {
    background-color: var(--bg-color-bubble-reciprocal);
    color: var(--text-color-primary);
  }

  &.is-active {
    color: var(--text-color-link);
    background-color: var(--bg-color-bubble-reciprocal);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background-color: var(--text-color-link);
    }
  }
}

.tab-content {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.license-tip {
  flex-shrink: 0;
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 10px 12px;
  color: var(--text-color-link);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    opacity: 0.85;
  }
}

</style>
