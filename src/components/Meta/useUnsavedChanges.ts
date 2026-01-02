import { Ref, ref, watch } from "vue";

/**
 * Track unsaved changes of a ref<string> initial baseline; auto-updates flag.
 */
export function useUnsavedChanges(
  content: Ref<string>,
  getBaseline: () => string
) {
  const hasUnsavedChanges = ref(false);
  watch(content, (val) => {
    hasUnsavedChanges.value = val !== getBaseline();
  });
  return {
    hasUnsavedChanges,
    markSaved() {
      hasUnsavedChanges.value = false;
    },
  };
}
