import type { DirectiveBinding, ObjectDirective } from 'vue';

type ClickOutsideHandler = (event: Event) => void;

const nodeMap = new WeakMap<HTMLElement, ClickOutsideHandler[]>();

const vClickOutside: ObjectDirective<HTMLElement, ClickOutsideHandler> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<ClickOutsideHandler>) {
    const listenerFunction: ClickOutsideHandler = (event: Event) => {
      const eventTarget = event.target as Node | null;
      if (eventTarget && el.contains(eventTarget)) {
        return;
      }
      if (typeof binding.value === 'function') {
        binding.value(event);
      }
    };
    const nodeCallbackList = nodeMap.get(el) || [];
    nodeCallbackList.push(listenerFunction);
    nodeMap.set(el, nodeCallbackList);
    document.addEventListener('click', listenerFunction);
    document.addEventListener('touchend', listenerFunction);
  },
  unmounted(el: HTMLElement) {
    const nodeCallbackList = nodeMap.get(el);
    if (!nodeCallbackList?.length) {
      return;
    }
    nodeCallbackList.forEach((callback: ClickOutsideHandler) => {
      document.removeEventListener('click', callback);
      document.removeEventListener('touchend', callback);
    });
    nodeMap.delete(el);
  },
};

export default vClickOutside;
