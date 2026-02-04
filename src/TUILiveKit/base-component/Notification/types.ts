export interface NotificationOptions {
  message: string
  duration?: number
  cancelText?: string
  acceptText?: string
  onCancel?: () => void
  onAccept?: () => void
  onTimeout?: () => void
}

