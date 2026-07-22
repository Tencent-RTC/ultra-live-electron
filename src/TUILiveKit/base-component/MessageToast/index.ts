import { createVNode, render, reactive } from 'vue'
import MessageToastList from './MessageToastList.vue'
import { MESSAGE_TOAST_CONTAINER_ID } from './constants'
// Import from the Notification leaf module (not its barrel) so that detecting
// the notification container does not introduce a cross-barrel circular
// dependency. See `../Notification/constants.ts` for the rationale.
import { NOTIFICATION_CONTAINER_ID } from '../Notification/constants'
import { MessageToastType } from './types'
import type { MessageToastOptions } from './types'

export type { MessageToastOptions }
export { MessageToastType }
// Re-export from the leaf module to keep the public API stable.
export { MESSAGE_TOAST_CONTAINER_ID }

interface MessageToastItem {
  id: number
  type: MessageToastType
  message: string
  duration: number
}

// Type-based auto-dismiss defaults (in milliseconds):
// success results disappear faster; failure/abnormal results stay longer.
const DEFAULT_DURATION: Record<MessageToastType, number> = {
  [MessageToastType.Success]: 3000,
  [MessageToastType.Info]: 5000,
  [MessageToastType.Warning]: 5000,
  [MessageToastType.Error]: 5000,
}

// Default top offset (px) when no Notification card is on screen.
const BASE_TOP = 60
// Vertical gap (px) kept below the Notification card when both are visible.
const STACK_GAP = 12
// Slightly longer than the 0.3s leave transition so the exit animation of the
// last toast can finish before the container is recycled.
const DESTROY_DELAY = 350

let container: HTMLDivElement | null = null
let destroyTimer: number | null = null
const messages = reactive<MessageToastItem[]>([])
let seed = 0

// Compute a start `top` that avoids overlapping the Notification card.
// The Notification container is removed from the DOM when hidden, so its
// presence reliably indicates a visible invitation card to avoid.
const resolveTop = (): number => {
  const notificationEl = document.getElementById(NOTIFICATION_CONTAINER_ID)
  const card = notificationEl?.firstElementChild as HTMLElement | null
  if (card) {
    const rect = card.getBoundingClientRect()
    if (rect.height > 0) {
      return Math.round(rect.bottom) + STACK_GAP
    }
  }
  return BASE_TOP
}

const applyContainerPosition = (): void => {
  if (container) {
    container.style.top = `${resolveTop()}px`
  }
}

const destroyContainer = (): void => {
  if (!container) {
    return
  }
  render(null, container)
  if (container.parentNode) {
    document.body.removeChild(container)
  }
  container = null
}

// Recycle the singleton container once all messages are gone, but defer it so
// the last toast's leave transition is not interrupted. A new message arriving
// during the delay cancels the pending teardown.
const scheduleDestroyIfEmpty = (): void => {
  if (messages.length > 0 || destroyTimer !== null) {
    return
  }
  destroyTimer = window.setTimeout(() => {
    destroyTimer = null
    if (messages.length === 0) {
      destroyContainer()
    }
  }, DESTROY_DELAY)
}

const removeMessage = (id: number): void => {
  const index = messages.findIndex((item) => item.id === id)
  if (index > -1) {
    messages.splice(index, 1)
  }
  scheduleDestroyIfEmpty()
}

const ensureMounted = (): void => {
  if (destroyTimer !== null) {
    clearTimeout(destroyTimer)
    destroyTimer = null
  }
  if (container) {
    return
  }
  container = document.createElement('div')
  container.id = MESSAGE_TOAST_CONTAINER_ID
  container.style.cssText = `
    position: fixed;
    top: ${BASE_TOP}px;
    right: 12px;
    z-index: 9999;
    pointer-events: none;
    min-width: 20%;
    max-width: 20%;
  `
  document.body.appendChild(container)

  const vNode = createVNode(MessageToastList, {
    messages,
    onRemove: removeMessage,
  })
  render(vNode, container)
}

/**
 * Show a lightweight, auto-dismissing message toast at the top-right corner of
 * the main window. Multiple toasts stack vertically. Use this everywhere on the
 * main window instead of calling the kit's TUIToast directly.
 *
 * Both macOS and Windows main windows now render their video preview through a
 * native surface and open dialogs as real child windows, so the kit's TUIToast
 * (rendered inside the web layer) can be occluded by that native surface / an
 * opened child window on either platform. This in-house toast is rendered into
 * `document.body` at a fixed top-right position that stays clear of those
 * surfaces, so it remains visible on both platforms — hence there is no longer
 * a platform branch here.
 */
export const showMessage = (options: MessageToastOptions): void => {
  ensureMounted()
  // Avoid overlapping a visible Notification invitation card.
  applyContainerPosition()
  const type = options.type || MessageToastType.Info
  messages.push({
    id: ++seed,
    type,
    message: options.message,
    duration: options.duration ?? DEFAULT_DURATION[type],
  })
}

/**
 * Backward-compatible alias for {@link showMessage}. Historically this was the
 * "raw in-house" variant used when `showMessage` still branched to TUIToast on
 * macOS; the branch has since been removed, so the two are identical. Kept as an
 * export to avoid breaking any existing import sites.
 */
export const showWindowMessage = showMessage
