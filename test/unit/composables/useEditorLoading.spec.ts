import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";
import { useEditorLoading } from "@/composables/useEditorLoading";

describe("editor content loading", () => {
  let dispose: (() => void) | undefined;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    dispose?.();
    vi.useRealTimers();
  });
  const setup = () => {
    const initialized = ref(false);
    const target = ref(1);
    const probe = vi.fn<() => Promise<Record<string, unknown>>>();
    let loading!: ReturnType<typeof useEditorLoading>;
    const app = createApp(
      defineComponent({
        setup() {
          loading = useEditorLoading({
            initialized: () => initialized.value,
            target: () => target.value,
            probe,
            timeoutMs: 2000,
          });
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    dispose = () => app.unmount();
    return { loading, initialized, target, probe };
  };
  it("keeps every action blocked through INIT and asset loading until the live editor is ready", async () => {
    const { loading, initialized, probe } = setup();
    expect(loading.getState()).toMatchObject({
      loading: true,
      blocked: true,
      ready: false,
    });
    probe
      .mockResolvedValueOnce({ ok: true, loading: true })
      .mockResolvedValueOnce({ ok: true, loading: false });
    initialized.value = true;
    await vi.advanceTimersByTimeAsync(0);
    expect(loading.ready.value).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(loading.getState()).toMatchObject({
      status: "ready",
      loading: false,
      blocked: false,
    });
    await vi.advanceTimersByTimeAsync(3000);
    expect(probe).toHaveBeenCalledTimes(2);
  });
  it("does not let an old document response unlock a new target", async () => {
    const { loading, initialized, target, probe } = setup();
    let resolve!: (state: Record<string, unknown>) => void;
    probe.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    initialized.value = true;
    await vi.advanceTimersByTimeAsync(0);
    initialized.value = false;
    target.value = 2;
    resolve({ ok: true, loading: false });
    await Promise.resolve();
    expect(loading.ready.value).toBe(false);
    expect(loading.getState().blocked).toBe(true);
  });
  it("offers recovery for missing handshake, failed API loading and retry", async () => {
    const { loading, initialized, target, probe } = setup();
    await vi.advanceTimersByTimeAsync(2000);
    expect(loading.getState()).toMatchObject({
      status: "error",
      error: "timeout",
      blocked: true,
      retryAfterMs: null,
    });
    target.value++;
    expect(loading.getState()).toMatchObject({
      status: "loading",
      error: null,
    });
    loading.fail("data-load-failed");
    expect(loading.status.value).toBe("error");
    target.value++;
    probe.mockResolvedValue({ ok: true, loading: false });
    initialized.value = true;
    await vi.advanceTimersByTimeAsync(0);
    expect(loading.ready.value).toBe(true);
  });
  it("does not unlock on missing or malformed loading responses", async () => {
    const { loading, initialized, probe } = setup();
    probe
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("not initialized"))
      .mockResolvedValue({ ok: false, loading: false });
    initialized.value = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(loading.getState()).toMatchObject({
      status: "error",
      blocked: true,
    });
  });
  it("disposes in-flight probes and timers on unmount", async () => {
    const { initialized, probe } = setup();
    probe.mockResolvedValue({ ok: true, loading: true });
    initialized.value = true;
    await vi.advanceTimersByTimeAsync(0);
    dispose?.();
    dispose = undefined;
    await vi.advanceTimersByTimeAsync(3000);
    expect(probe).toHaveBeenCalledTimes(1);
  });
});
