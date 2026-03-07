import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, h, ref, type Ref } from "vue";
import { useSubmitThrottle } from "@/views/settings/composables/useSubmitThrottle";

const mountUseSubmitThrottle = (durationMs?: number) => {
  let isDisableRef: Ref<boolean>;
  let startSubmitThrottle!: () => void;

  const app = createApp(
    defineComponent({
      setup() {
        isDisableRef = ref(false);
        ({ startSubmitThrottle } = useSubmitThrottle({
          isDisable: isDisableRef,
          durationMs,
        }));
        return () => h("div");
      },
    })
  );

  const el = document.createElement("div");
  app.mount(el);

  return {
    startSubmitThrottle,
    getIsDisable: () => isDisableRef.value,
    unmount: () => app.unmount(),
  };
};

describe("useSubmitThrottle", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("disables submit during throttle window and restores after timeout", () => {
    vi.useFakeTimers();
    const { startSubmitThrottle, getIsDisable, unmount } =
      mountUseSubmitThrottle(500);

    startSubmitThrottle();
    expect(getIsDisable()).toBe(true);

    vi.advanceTimersByTime(499);
    expect(getIsDisable()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(getIsDisable()).toBe(false);

    unmount();
  });

  it("cleans timer on unmount and restores disabled flag", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { startSubmitThrottle, getIsDisable, unmount } =
      mountUseSubmitThrottle(500);

    startSubmitThrottle();
    expect(getIsDisable()).toBe(true);

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(getIsDisable()).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(getIsDisable()).toBe(false);
  });
});
