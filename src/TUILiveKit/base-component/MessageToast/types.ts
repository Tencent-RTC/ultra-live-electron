export enum MessageToastType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export interface MessageToastOptions {
  message: string
  type?: MessageToastType
  // Auto-dismiss duration in milliseconds. When omitted, a type-based
  // default is used (success: 3s, others: 5s).
  duration?: number
}
