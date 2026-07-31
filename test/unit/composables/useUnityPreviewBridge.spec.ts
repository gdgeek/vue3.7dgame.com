import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type App } from "vue";

vi.mock("@/environment", () => ({
  default: {
    unityPreview: "/webgl-preview/embed.html",
    api: "/api",
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/utils/unityPreviewPayload", () => ({
  cloneForUnityPreview: vi.fn((payload: unknown) => payload),
  rewriteUnityPreviewUrls: vi.fn(),
  summarizeUnityPreviewPayload: vi.fn(() => ({})),
}));

import { useUnityPreviewBridge } from "@/composables/useUnityPreviewBridge";

type PreviewBridge = ReturnType<typeof useUnityPreviewBridge>;

describe("useUnityPreviewBridge session boundary", () => {
  let app: App<Element>;
  let mountTarget: HTMLDivElement;
  let bridge: PreviewBridge;
  let frameSource: Window;
  let postMessage: ReturnType<typeof vi.fn>;
  let buildPayload: ReturnType<typeof vi.fn>;
  let ensureRuntimeData: ReturnType<typeof vi.fn>;
  let notifyError: ReturnType<typeof vi.fn>;
  let appMounted: boolean;

  const dispatchRunnerMessage = (
    data: Record<string, unknown>,
    origin: string
  ) => {
    const event = new MessageEvent("message", { data, origin });
    Object.defineProperty(event, "source", { value: frameSource });
    window.dispatchEvent(event);
  };

  const flushBridgePromises = async () => {
    await Promise.resolve();
    await nextTick();
    await Promise.resolve();
  };

  beforeEach(() => {
    frameSource = {} as Window;
    postMessage = vi.fn(() => true);
    buildPayload = vi.fn(() => ({ scene: { id: 42 } }));
    ensureRuntimeData = vi.fn(async () => undefined);
    notifyError = vi.fn();

    mountTarget = document.createElement("div");
    document.body.append(mountTarget);
    app = createApp(
      defineComponent({
        setup() {
          bridge = useUnityPreviewBridge({
            buildPayload,
            ensureRuntimeData,
            notifyError,
          });
          return () => h("div");
        },
      })
    );
    app.mount(mountTarget);
    appMounted = true;

    bridge.dialogRef.value = {
      isFrameSource: (source: MessageEventSource | null) =>
        source === frameSource,
      postMessage,
      toggleFullscreen: vi.fn(),
    } as unknown as NonNullable<typeof bridge.dialogRef.value>;
  });

  afterEach(() => {
    if (appMounted) app.unmount();
    mountTarget.remove();
  });

  it("binds URL, incoming ready, payload and camera messages to one session", async () => {
    await bridge.open();

    const runnerUrl = new URL(bridge.src.value);
    const session = runnerUrl.searchParams.get("session");
    expect(runnerUrl.pathname).toBe("/webgl-preview/embed.html");
    expect(session).toMatch(/^unity-preview-[A-Za-z0-9-]+$/);

    dispatchRunnerMessage(
      { type: "unity-web-preview-ready", session },
      "https://attacker.example"
    );
    dispatchRunnerMessage(
      { type: "unity-web-preview-ready", session: `${session}-stale` },
      runnerUrl.origin
    );
    await flushBridgePromises();
    expect(bridge.ready.value).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();

    dispatchRunnerMessage(
      { type: "unity-web-preview-ready", session },
      runnerUrl.origin
    );
    await flushBridgePromises();

    expect(bridge.ready.value).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "xrugc-load-scene-json",
        session,
        payload: { scene: { id: 42 } },
      }),
      runnerUrl.origin
    );
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "unity-web-preview-camera-mode",
        session,
        mode: "orbit",
      },
      runnerUrl.origin
    );
    expect(buildPayload).toHaveBeenCalledTimes(1);
  });

  it("disposes the current session and rejects its messages after reopening", async () => {
    await bridge.open();
    const firstUrl = new URL(bridge.src.value);
    const firstSession = firstUrl.searchParams.get("session");

    bridge.handleClosed();
    expect(postMessage).toHaveBeenCalledWith(
      { type: "webgl-preview-dispose", session: firstSession },
      firstUrl.origin
    );

    postMessage.mockClear();
    await bridge.open();
    const secondUrl = new URL(bridge.src.value);
    const secondSession = secondUrl.searchParams.get("session");
    expect(secondSession).not.toBe(firstSession);

    dispatchRunnerMessage(
      { type: "unity-web-preview-ready", session: firstSession },
      secondUrl.origin
    );
    await flushBridgePromises();
    expect(bridge.ready.value).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("drops a delayed send after close and does not deliver it into a reopened session", async () => {
    await bridge.open();
    const firstSession = new URL(bridge.src.value).searchParams.get("session");
    postMessage.mockClear();

    let resolveDelayedPayload!: (payload: unknown) => void;
    buildPayload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDelayedPayload = resolve;
        })
    );
    const delayedSend = bridge.send();
    await flushBridgePromises();

    bridge.handleClosed();
    expect(postMessage).toHaveBeenCalledWith(
      { type: "webgl-preview-dispose", session: firstSession },
      window.location.origin
    );

    buildPayload.mockImplementationOnce(() => ({ scene: { id: 84 } }));
    await bridge.open();
    const secondUrl = new URL(bridge.src.value);
    const secondSession = secondUrl.searchParams.get("session");

    resolveDelayedPayload({ scene: { id: 7 } });
    await delayedSend;
    dispatchRunnerMessage(
      { type: "unity-web-preview-ready", session: secondSession },
      secondUrl.origin
    );
    await flushBridgePromises();

    const payloadMessages = postMessage.mock.calls
      .map(([message]) => message as { type?: string; payload?: unknown })
      .filter((message) => message.type === "xrugc-load-scene-json");
    expect(payloadMessages).toEqual([
      expect.objectContaining({
        session: secondSession,
        payload: { scene: { id: 84 } },
      }),
    ]);
    expect(bridge.pendingPayload.value).toEqual({ scene: { id: 84 } });
  });

  it("keeps a closed bridge closed when an in-flight open resolves late", async () => {
    let resolveOpeningPayload!: (payload: unknown) => void;
    buildPayload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOpeningPayload = resolve;
        })
    );

    const opening = bridge.open();
    await flushBridgePromises();
    bridge.handleClosed();
    resolveOpeningPayload({ scene: { id: 99 } });
    await opening;

    expect(bridge.visible.value).toBe(false);
    expect(bridge.frameVisible.value).toBe(false);
    expect(bridge.pendingPayload.value).toBeNull();
    expect(new URL(bridge.src.value).searchParams.get("session")).toBeNull();
  });

  it("does not revive an in-flight open after the owner component unmounts", async () => {
    let resolveOpeningPayload!: (payload: unknown) => void;
    buildPayload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOpeningPayload = resolve;
        })
    );

    const opening = bridge.open();
    await flushBridgePromises();
    app.unmount();
    appMounted = false;
    resolveOpeningPayload({ scene: { id: 100 } });
    await opening;

    expect(bridge.frameVisible.value).toBe(false);
    expect(bridge.pendingPayload.value).toBeNull();
    expect(new URL(bridge.src.value).searchParams.get("session")).toBeNull();
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "xrugc-load-scene-json" }),
      expect.any(String)
    );
  });
});
