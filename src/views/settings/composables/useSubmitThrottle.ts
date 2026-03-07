import { onUnmounted } from "vue";
import type { Ref } from "vue";

interface UseSubmitThrottleDeps {
  isDisable: Ref<boolean>;
  durationMs?: number;
}

const DEFAULT_SUBMIT_THROTTLE_MS = 2000;

export const useSubmitThrottle = (deps: UseSubmitThrottleDeps) => {
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSubmitThrottle = (): void => {
    if (throttleTimer != null) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
    deps.isDisable.value = false;
  };

  const startSubmitThrottle = (): void => {
    if (throttleTimer != null) {
      clearTimeout(throttleTimer);
    }

    deps.isDisable.value = true;
    throttleTimer = setTimeout(() => {
      deps.isDisable.value = false;
      throttleTimer = null;
    }, deps.durationMs ?? DEFAULT_SUBMIT_THROTTLE_MS);
  };

  onUnmounted(() => {
    clearSubmitThrottle();
  });

  return {
    startSubmitThrottle,
  };
};
