export interface DialogProps {
  visible?: boolean;
  title?: string;
  width?: string | number;
  height?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  closable?: boolean;
  maskClosable?: boolean;
  showFooter?: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
  destroyOnClose?: boolean;
  zIndex?: number;
  customClass?: string;
}

export interface DialogEmits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
}

export interface DialogOptions extends Omit<DialogProps, 'visible'> {
  content?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface DialogInstance {
  close: () => void;
  destroy: () => void;
}