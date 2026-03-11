import { computed, type ComputedRef } from 'vue';

/**
 * Composable for building dialog custom classes list.
 * Merges a base dialog class with optional extra classes from props.
 * @param baseClass - The base CSS class name for the dialog
 * @param customClasses - Optional extra classes string (typically from props)
 * @returns A computed ref of the merged classes array
 */
export function useDialogClasses(
  baseClass: string,
  customClasses: () => string | undefined,
): ComputedRef<string[]> {
  return computed(() => {
    const classes = [baseClass];
    const extra = customClasses();
    if (extra) {
      classes.push(extra);
    }
    return classes;
  });
}
