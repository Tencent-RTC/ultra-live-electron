<template>
  <TUIDialog
    :visible="true"
    width="100%"
    :confirmText="confirmText"
    :cancelText="t('Cancel')"
    @close="handleClose"
    @cancel="handleClose"
    @confirm="handleConfirm"
    :confirmDisabled="!videoUrl || isSubmitting"
    :title="title"
    :customClasses="dialogCustomClasses"
  >
    <div class="online-video-setting">
      <div class="item-setting">
        <span class="title">{{ t('Online Video URL') }}</span>
        <input
          class="url-input"
          type="text"
          v-model="videoUrl"
          :placeholder="t('Example: rtmp://... or https://...xxx.mp4')"
        />
      </div>
      <div class="item-setting">
        <span class="title">{{ t('Video Settings') }}</span>
        <div class="setting-group">
          <div class="setting-row">
            <span class="label">{{ t('Volume') }}</span>
            <div class="slider-row">
              <TUISlider
                v-model="playoutVolume"
                class="setting-slider"
                :min="0"
                :max="100"
              />
              <span class="slider-value">{{ playoutVolume }}</span>
            </div>
          </div>
          <div class="setting-row">
            <span class="label">{{ t('Network Cache') }}</span>
            <div class="slider-row">
              <TUISlider
                v-model="networkCacheSizeKB"
                class="setting-slider"
                :min="0"
                :max="10240"
              />
              <span class="slider-value">{{ networkCacheSizeKB }} KB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </TUIDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { TUIDialog, TUISlider, TUIToast, TOAST_TYPE, useUIKit } from '@tencentcloud/uikit-base-component-vue3';
import type { MediaSource } from 'tuikit-atomicx-vue3-electron';
import { useDialogClasses } from '../../hooks/useDialogClasses';

const { t } = useUIKit();

const props = defineProps<{
  mediaSource?: MediaSource | null;
  customClasses?: string;
}>();

const emits = defineEmits<{
  addOnlineVideoMaterial: [payload: { url: string; playoutVolume: number; networkCacheSizeKB: number }];
  updateOnlineVideoMaterial: [oldMediaSource: MediaSource, payload: { url: string; playoutVolume: number; networkCacheSizeKB: number }];
  close: [];
}>();

const dialogCustomClasses = useDialogClasses('online-video-dialog', () => props.customClasses);

const isEditMode = computed(() => !!props.mediaSource);

const title = computed(() => isEditMode.value ? t('Online Video Settings') : t('Add Online Video'));
const confirmText = computed(() => isEditMode.value ? t('Update') : t('Add Online Video'));

// NOTE: These refs intentionally capture props.mediaSource only at setup.
// ChildView mounts this dialog with `v-if`, so a fresh instance is created
// per open/edit cycle and there is no need to watch props.mediaSource.
const videoUrl = ref(props.mediaSource?.sourceId || '');
const playoutVolume = ref(props.mediaSource?.onlineVideo?.playoutVolume ?? 100);
const networkCacheSizeKB = ref(props.mediaSource?.onlineVideo?.networkCacheSizeKB ?? 1024);

/**
 * Submit-in-flight guard. See LocalVideoDialog.vue for the race-condition rationale.
 * No reset is exposed because ChildView uses `:key="panelOpenSeq"` to force a fresh
 * dialog instance on every reopen, so isSubmitting naturally starts at false each time.
 */
const isSubmitting = ref(false);

/**
 * Supported online video formats:
 * 1. Live streams: RTMP, HLS (.m3u8), FLV
 * 2. HTTP/HTTPS online files: MOV, MP4, MKV
 */
const SUPPORTED_PROTOCOLS = ['http:', 'https:'];
const HTTP_PROTOCOLS = ['http:', 'https:'];
const SUPPORTED_HTTP_VIDEO_EXTENSIONS = ['.mov', '.mp4', '.mkv', '.flv', '.m3u8'];
// Streaming-format hints commonly carried in CDN query parameters when the URL path has no extension
const STREAMING_QUERY_HINTS = ['m3u8', 'flv'];

/**
 * RTMP / RTMPS regex guard.
 *
 * We deliberately do NOT rely on `new URL(...)` for rtmp schemes because
 * `rtmp:` / `rtmps:` are non-special schemes per the WHATWG URL standard,
 * and different Chromium / Electron versions parse them inconsistently
 * (some throw, some return an empty `host`). The regex checks:
 *   - authority (host[:port]) must have at least one non-delimiter char
 *   - stream path must have at least one more non-space segment after the host
 * which is sufficient to reject obvious typos like `rtmp://` or `rtmp://host`
 * without pretending to validate arbitrary stream keys.
 */
const RTMP_URL_RE = /^rtmps?:\/\/[^/?#\s]+(:\d+)?\/\S+/i;

function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  // 1. RTMP / RTMPS: regex-only validation (see RTMP_URL_RE above).
  if (/^rtmps?:\/\//i.test(trimmed)) {
    return RTMP_URL_RE.test(trimmed);
  }

  // 2. HTTP / HTTPS: fall back to WHATWG URL parsing.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  // 2a. Protocol whitelist
  if (!SUPPORTED_PROTOCOLS.includes(parsed.protocol)) return false;

  // 2b. Must have a host
  if (!parsed.host) return false;

  // 2c. HTTP / HTTPS: check path extension. Only the path is lowercased for
  //     comparison; the original URL keeps its case (paths are case-sensitive
  //     per RFC 3986).
  if (HTTP_PROTOCOLS.includes(parsed.protocol)) {
    const lowerPath = parsed.pathname.toLowerCase();
    if (SUPPORTED_HTTP_VIDEO_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
      return true;
    }
    // 2d. Fallback for CDN-style URLs without a file extension in the path.
    //     Many CDNs serve HLS / FLV via routes like https://cdn.com/live?type=m3u8
    const lowerQuery = parsed.search.toLowerCase();
    if (STREAMING_QUERY_HINTS.some(hint => lowerQuery.includes(hint))) {
      return true;
    }
  }

  return false;
}

function handleConfirm() {
  const url = videoUrl.value.trim();
  if (!url || isSubmitting.value) return;

  if (!isValidUrl(url)) {
    TUIToast({
      type: TOAST_TYPE.WARNING,
      message: t('Supported formats: RTMP, HLS(.m3u8), FLV streams and HTTP/HTTPS online MOV, MP4, MKV files'),
    });
    return;
  }

  isSubmitting.value = true;
  if (isEditMode.value && props.mediaSource) {
    emits('updateOnlineVideoMaterial', props.mediaSource, {
      url,
      playoutVolume: playoutVolume.value,
      networkCacheSizeKB: networkCacheSizeKB.value,
    });
  } else {
    emits('addOnlineVideoMaterial', {
      url,
      playoutVolume: playoutVolume.value,
      networkCacheSizeKB: networkCacheSizeKB.value,
    });
  }
}

function handleClose() {
  emits('close');
}
</script>

<style lang="scss" scoped>
:deep(.online-video-dialog) {
  .tui-dialog-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 0;
    min-height: 0;
  }

  .tui-dialog-header,
  .tui-dialog-footer {
    flex-shrink: 0;
  }
}

.online-video-setting {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;

  .item-setting {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;

    > .title {
      font-size: 14px;
      color: var(--text-color-secondary);
      margin-bottom: 12px;
    }
  }

  .url-input {
    width: 100%;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--stroke-color-primary);
    border-radius: 8px;
    background: transparent;
    color: var(--text-color-primary);
    font-size: 14px;
    outline: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &::placeholder {
      color: var(--text-color-secondary);
      opacity: 0.5;
    }
  }

  .setting-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .setting-row {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .label {
      font-size: 13px;
      color: var(--text-color-secondary);
      opacity: 0.8;
    }
  }

  .slider-row {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 12px;

    .setting-slider {
      flex: 1;
    }

    .slider-value {
      min-width: 56px;
      text-align: right;
      font-size: 14px;
      color: var(--text-color-primary);
    }
  }
}
</style>
