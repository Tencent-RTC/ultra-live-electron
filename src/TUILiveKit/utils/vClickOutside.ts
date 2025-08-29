
const nodeMap = new Map();

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    const listenerFunction = (event: any) => {
      if (el.contains(event.target)) {
        return;
      }
      if (binding.value && typeof binding.value === 'function') {
        binding.value(event);
      }
    };
    if (!nodeMap.has(el)) {
      nodeMap.set(el, []);
    }
    const nodeCallbackList = nodeMap.get(el);
    nodeCallbackList.push(listenerFunction);
    document.addEventListener('click', listenerFunction, false);
  },
  unmounted(el: HTMLElement) {
    const nodeCallbackList = nodeMap.get(el);
    nodeCallbackList.forEach((callback: any) => {
      document.removeEventListener('click', callback, false);
    });
  },
};

export default vClickOutside;
