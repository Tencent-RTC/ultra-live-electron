import { createApp, App } from 'vue';
import DialogComponent from './Index.vue';

export interface DialogOptions {
  title?: string;
  content?: string;
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
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface DialogInstance {
  close: () => void;
  destroy: () => void;
}

let dialogId = 0;

export function dialog(options: DialogOptions): DialogInstance {
  const id = `dialog-${++dialogId}`;
  const container = document.createElement('div');
  container.id = id;
  document.body.appendChild(container);

  let app: App | null = null;
  let isDestroyed = false;

  const instance: DialogInstance = {
    close() {
      if (isDestroyed) return;
      
      if (app) {
        app.unmount();
        app = null;
      }
      
      const element = document.getElementById(id);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      isDestroyed = true;
      
      if (options.onClose) {
        options.onClose();
      }
    },
    
    destroy() {
      this.close();
    }
  };

  const props = {
    visible: true,
    title: options.title || '',
    width: options.width || '28rem',
    height: options.height || 'auto',
    maxWidth: options.maxWidth || '90vw',
    maxHeight: options.maxHeight || '80vh',
    closable: options.closable !== false,
    maskClosable: options.maskClosable !== false,
    showFooter: options.showFooter !== false,
    confirmText: options.confirmText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
    confirmLoading: options.confirmLoading || false,
    destroyOnClose: options.destroyOnClose !== false,
    zIndex: options.zIndex || 1000,
    customClass: options.customClass || '',
  };

  app = createApp(DialogComponent, {
    ...props,
    content: options.content || '',
    onConfirm: async () => {
      if (options.onConfirm) {
        try {
          await options.onConfirm();
          instance.close();
        } catch (error) {
          console.error('Dialog confirm error:', error);
        }
      } else {
        instance.close();
      }
    },
    onCancel: () => {
      if (options.onCancel) {
        options.onCancel();
      }
      instance.close();
    },
    onClose: () => {
      instance.close();
    },
    'onUpdate:visible': (visible: boolean) => {
      if (!visible) {
        instance.close();
      }
    }
  });

  app.mount(container);

  return instance;
}

export const confirm = (options: DialogOptions): DialogInstance => {
  return dialog({
    ...options,
    showFooter: true,
  });
};

export const alert = (options: DialogOptions): DialogInstance => {
  return dialog({
    ...options,
    showFooter: true,
    cancelText: '',
  });
};

export const info = (content: string, title?: string): DialogInstance => {
  return dialog({
    content,
    title: title || 'Information',
    showFooter: true,
    cancelText: '',
  });
};

export const success = (content: string, title?: string): DialogInstance => {
  return dialog({
    content,
    title: title || 'Success',
    showFooter: true,
    cancelText: '',
  });
};

export const warning = (content: string, title?: string): DialogInstance => {
  return dialog({
    content,
    title: title || 'Warning',
    showFooter: true,
    cancelText: '',
  });
};

export const error = (content: string, title?: string): DialogInstance => {
  return dialog({
    content,
    title: title || 'Error',
    showFooter: true,
    cancelText: '',
  });
};