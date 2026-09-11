import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  reactive,
  type App,
} from "vue";

vi.mock("@/environment", () => ({ default: { api: "/api" } }));
vi.mock("@/utils/logger", () => ({ logger: { log: vi.fn(), warn: vi.fn() } }));
vi.mock("@/utils/unityPreviewPayload", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/unityPreviewPayload")>();
  return {
    ...actual,
    rewriteUnityPreviewUrls: vi.fn(),
    summarizeUnityPreviewPayload: vi.fn(() => ({})),
  };
});
import { useUnityPreviewBridge } from "@/composables/useUnityPreviewBridge";
import {
  rewriteUnityPreviewUrls,
  UnityPreviewAssetError,
} from "@/utils/unityPreviewPayload";

const release = {
  protocolVersion: 1,
  runtimeReleaseId: "abcdef0123456789abcdef01",
  buildId:
    "sha256:7bee87bbf1c044802841b46489638cb5069eac5b51fb0637714a3b826b092f33",
  entrypoint: "/webgl-preview/releases/abcdef0123456789abcdef01/embed.html",
};

describe("built-in Unity controller", () => {
  let app: App<Element>;
  let mountTarget: HTMLDivElement;
  let bridge: ReturnType<typeof useUnityPreviewBridge>;
  let frameSource: Window;
  let postMessage: ReturnType<typeof vi.fn>;
  let buildPayload: ReturnType<typeof vi.fn>;
  let ensureRuntimeData: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let mounted: boolean;

  const envelope = (type: string, fields: Record<string, unknown> = {}) => ({
    type,
    protocolVersion: 1,
    sessionId: bridge.sessionId.value,
    runtimeReleaseId: release.runtimeReleaseId,
    buildId: release.buildId,
    ...fields,
  });
  const dispatch = (
    data: Record<string, unknown>,
    origin = window.location.origin,
    source: MessageEventSource | null = frameSource
  ) => {
    const event = new MessageEvent("message", { data, origin });
    Object.defineProperty(event, "source", { value: source });
    window.dispatchEvent(event);
  };
  const flush = async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    await nextTick();
  };
  const finishClose = async () => {
    const closing = bridge.close();
    dispatch(envelope("unity-web-preview-disposed"));
    await closing;
  };
  const ready = () => dispatch(envelope("unity-web-preview-ready"));
  const forwarded = () =>
    dispatch(envelope("unity-web-preview-scene-forwarded"));

  beforeEach(() => {
    vi.useFakeTimers();
    frameSource = {} as Window;
    postMessage = vi.fn((message: unknown) => {
      // Match the real Window.postMessage boundary: Vue proxies must throw.
      structuredClone(message);
      return true;
    });
    buildPayload = vi.fn(() => ({ scene: { id: 42 } }));
    ensureRuntimeData = vi.fn(async () => undefined);
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ...release }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    mountTarget = document.createElement("div");
    document.body.append(mountTarget);
    app = createApp(
      defineComponent({
        setup() {
          bridge = useUnityPreviewBridge({
            buildPayload,
            ensureRuntimeData,
            notifyError: vi.fn(),
          });
          return () => h("div");
        },
      })
    );
    app.mount(mountTarget);
    mounted = true;
    bridge.dialogRef.value = {
      isFrameSource: (source: MessageEventSource | null) =>
        source === frameSource,
      postMessage,
    } as unknown as NonNullable<typeof bridge.dialogRef.value>;
  });
  afterEach(async () => {
    if (mounted) app.unmount();
    await vi.runAllTimersAsync();
    mountTarget.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("pins the same-origin entry to active metadata and sends one payload per iframe", async () => {
    await bridge.open();
    const url = new URL(bridge.src.value);
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe(release.entrypoint);
    expect(url.searchParams.get("sessionId")).toMatch(/^unity-preview-/);
    expect(fetchMock).toHaveBeenCalledWith(
      "/webgl-preview/active.json",
      expect.objectContaining({
        cache: "no-store",
        redirect: "error",
        signal: expect.any(AbortSignal),
      })
    );
    ready();
    ready();
    await bridge.send();
    const payloads = postMessage.mock.calls.filter(
      ([m]) => m.type === "xrugc-load-scene-json"
    );
    expect(payloads).toHaveLength(1);
    expect(payloads[0][0]).toMatchObject(
      envelope("xrugc-load-scene-json", { payload: { scene: { id: 42 } } })
    );
    expect(bridge.stage.value).toBe("loading_scene");
  });

  it("keeps prepared nested scene JSON cloneable when the source is Vue-reactive", async () => {
    const scene = reactive({
      scene: { id: 42, data: { modules: [{ id: 7, position: [1, 0, 0] }] } },
    });
    buildPayload.mockReturnValueOnce(scene);
    await bridge.open();
    expect(() => structuredClone(bridge.pendingPayload.value)).not.toThrow();
    expect(structuredClone(bridge.pendingPayload.value)).toEqual(
      JSON.parse(JSON.stringify(scene))
    );
    ready();
    expect(bridge.stage.value).toBe("loading_scene");
    expect(bridge.failure.value).toBeNull();
    const sent = postMessage.mock.calls.find(
      ([message]) =>
        (message as { type: string }).type === "xrugc-load-scene-json"
    )?.[0];
    expect(() => structuredClone(sent)).not.toThrow();
    expect(sent).toMatchObject({ payload: { scene: { id: 42 } } });
  });

  it("turns a native postMessage exception into SCENE_FORWARD_FAILED and cleans up", async () => {
    await bridge.open();
    postMessage.mockImplementationOnce(() => {
      throw new DOMException("Payload could not be cloned", "DataCloneError");
    });
    expect(() => ready()).not.toThrow();
    expect(bridge.runtimeState.value).toMatchObject({
      stage: "error",
      phase: "attention",
      failure: { code: "SCENE_FORWARD_FAILED" },
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "unity-web-preview-dispose" }),
      window.location.origin
    );
    dispatch(envelope("unity-web-preview-disposed"));
    await flush();
    expect(bridge.frameVisible.value).toBe(false);
    expect(bridge.failure.value?.code).toBe("SCENE_FORWARD_FAILED");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exposes safe asset rejection details to the shared runtime status", async () => {
    vi.mocked(rewriteUnityPreviewUrls).mockImplementationOnce(() => {
      const error = new UnityPreviewAssetError(
        "https://private.example/model.glb?token=secret",
        "origin"
      );
      error.fields.push("resources", "0", "file", "url");
      throw error;
    });
    await bridge.open();
    expect(bridge.runtimeState.value).toMatchObject({
      frameVisible: false,
      failure: {
        code: "SCENE_ASSET_ORIGIN_DENIED",
        asset: {
          field: "resources.0.file.url",
          origin: "https://private.example",
          reason: "origin",
        },
      },
    });
    expect(JSON.stringify(bridge.runtimeState.value)).not.toContain(
      "token=secret"
    );
    await bridge.close();
    expect(bridge.runtimeState.value.failure).toBeNull();
  });

  it("rejects unsupported resource origins during preparing without mounting or downloading Unity", async () => {
    vi.mocked(rewriteUnityPreviewUrls).mockImplementationOnce(() => {
      throw new Error("WGP-ASSET-DENIED: signed-private-url");
    });
    await bridge.open();
    expect(rewriteUnityPreviewUrls).toHaveBeenLastCalledWith(
      { scene: { id: 42 } },
      window.location.origin,
      window.location.origin,
      { restrictToRuntimeOrigins: true }
    );
    expect(bridge.runtimeState.value).toMatchObject({
      visible: true,
      frameVisible: false,
      stage: "error",
      phase: "attention",
      failure: { code: "SCENE_ASSET_ORIGIN_DENIED", stage: "preparing" },
    });
    expect(bridge.frameKey.value).toBe(0);
    expect(postMessage).not.toHaveBeenCalled();
    expect(bridge.failure.value?.message).toContain("data.7dgame.com");
    expect(bridge.failure.value?.message).toContain("不会自动转发登录凭据");
    expect(JSON.stringify(bridge.runtimeState.value)).not.toContain(
      "signed-private-url"
    );
  });

  it.each([
    { sessionId: "stale" },
    { buildId: "sha256:wrong" },
    { runtimeReleaseId: "old-release" },
    { protocolVersion: 0 },
  ])("rejects an incorrect identity %j before READY", async (fields) => {
    await bridge.open();
    dispatch(envelope("unity-web-preview-ready", fields));
    expect(bridge.ready.value).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("rejects another origin, frame and all bare events except the gated native running callback", async () => {
    await bridge.open();
    dispatch(envelope("unity-web-preview-ready"), "https://attacker.example");
    dispatch(
      envelope("unity-web-preview-ready"),
      window.location.origin,
      {} as Window
    );
    dispatch({ type: "unity-web-preview-ready" });
    dispatch({ type: "unity-web-preview-scene-running" });
    expect(bridge.ready.value).toBe(false);
    ready();
    expect(bridge.phase.value).toBe("ready");
    forwarded();
    dispatch(
      envelope("unity-web-preview-scene-running", { sessionId: "stale" })
    );
    dispatch(
      { type: "unity-web-preview-scene-running" },
      window.location.origin,
      {} as Window
    );
    dispatch(
      { type: "unity-web-preview-scene-running" },
      "https://attacker.example"
    );
    expect(bridge.phase.value).toBe("ready");
    dispatch({
      type: "unity-web-preview-scene-running",
      message: "Scene is running",
    });
    expect(bridge.phase.value).toBe("running");
    dispatch(envelope("unity-web-preview-scene-visible"));
    expect(bridge.runtimeState.value.evidence?.kind).toBe(
      "unity-scene-started-callback"
    );
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "unity-web-preview-runtime-confirmed",
        sessionId: bridge.sessionId.value,
      }),
      window.location.origin
    );
  });

  it("buffers a native callback delivered before typed scene-forwarded without announcing success early", async () => {
    await bridge.open();
    ready();
    dispatch({
      type: "unity-web-preview-scene-running",
      message: "Scene is running",
    });
    expect(bridge.stage.value).toBe("loading_scene");
    expect(bridge.runtimeState.value.evidence).toBeNull();
    forwarded();
    expect(bridge.stage.value).toBe("running");
  });

  it("does not carry buffered native evidence into a retry or accept old iframe callbacks", async () => {
    await bridge.open();
    ready();
    const oldFrame = frameSource;
    dispatch({ type: "unity-web-preview-scene-running" });
    const retry = bridge.retry();
    dispatch(envelope("unity-web-preview-disposed"));
    frameSource = {} as Window;
    await retry;
    ready();
    forwarded();
    dispatch(
      { type: "unity-web-preview-scene-running" },
      window.location.origin,
      oldFrame
    );
    expect(bridge.stage.value).toBe("loading_scene");
  });

  it("still times out if native evidence has no corresponding forwarded acknowledgement", async () => {
    await bridge.open();
    ready();
    dispatch({ type: "unity-web-preview-scene-running" });
    await vi.advanceTimersByTimeAsync(120000);
    expect(bridge.failure.value?.code).toBe("SCENE_CONFIRMATION_TIMEOUT");
    forwarded();
    expect(bridge.phase.value).toBe("attention");
  });

  it("does not elevate visible logs or payload forwarding to running", async () => {
    await bridge.open();
    ready();
    forwarded();
    dispatch(envelope("unity-web-preview-scene-visible"));
    dispatch(envelope("unity-web-preview-state", { stage: "running" }));
    expect(bridge.stage.value).toBe("loading_scene");
    expect(bridge.progress.value.kind).toBe("indeterminate");
    await vi.advanceTimersByTimeAsync(120000);
    expect(bridge.phase.value).toBe("attention");
    expect(bridge.failure.value?.code).toBe("SCENE_CONFIRMATION_TIMEOUT");
    dispatch({ type: "unity-web-preview-scene-running" });
    expect(bridge.phase.value).toBe("attention");
  });

  it("waits for matching disposed before removing the old iframe or creating a retry", async () => {
    await bridge.open();
    const firstSession = bridge.sessionId.value;
    const firstKey = bridge.frameKey.value;
    const retry = bridge.retry();
    expect(bridge.stage.value).toBe("stopping");
    expect(bridge.frameVisible.value).toBe(true);
    dispatch(envelope("unity-web-preview-disposed", { sessionId: "stale" }));
    await flush();
    expect(bridge.frameKey.value).toBe(firstKey);
    dispatch(envelope("unity-web-preview-disposed"));
    frameSource = {} as Window;
    await retry;
    expect(bridge.sessionId.value).not.toBe(firstSession);
    expect(bridge.frameKey.value).toBe(firstKey + 1);
    dispatch(
      envelope("unity-web-preview-error", {
        sessionId: firstSession,
        code: "UNITY_LOAD_FAILED",
      })
    );
    expect(bridge.failure.value).toBeNull();
  });

  it("force-removes a nonresponsive iframe after a bounded Quit wait", async () => {
    await bridge.open();
    const closing = bridge.close();
    await vi.advanceTimersByTimeAsync(4999);
    expect(bridge.frameVisible.value).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await closing;
    expect(bridge.runtimeState.value).toMatchObject({
      phase: "closed",
      cleanup: "timeout",
      frameVisible: false,
      sessionId: null,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels metadata/preparation and ignores a delayed scene payload after close", async () => {
    let resolvePayload!: (value: unknown) => void;
    buildPayload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePayload = resolve;
        })
    );
    const opening = bridge.open();
    await flush();
    const signal = fetchMock.mock.calls[0][1].signal;
    await bridge.close();
    resolvePayload({ scene: { id: 999 } });
    await opening;
    expect(signal.aborted).toBe(true);
    expect(bridge.runtimeState.value).toMatchObject({
      phase: "closed",
      frameVisible: false,
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("ignores an in-flight open when its page unmounts", async () => {
    let resolvePayload!: (value: unknown) => void;
    buildPayload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePayload = resolve;
        })
    );
    const opening = bridge.open();
    await flush();
    app.unmount();
    mounted = false;
    resolvePayload({ scene: { id: 999 } });
    await opening;
    expect(bridge.frameVisible.value).toBe(false);
    expect(bridge.src.value).toBe("");
  });

  it("quits and destroys a failed runtime while retaining actionable diagnostics", async () => {
    await bridge.open();
    ready();
    forwarded();
    const activeSession = bridge.sessionId.value;
    dispatch(envelope("unity-web-preview-scene-visible"));
    dispatch(
      envelope("unity-web-preview-error", { code: "UNITY_DOWNLOAD_STALLED" })
    );
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "unity-web-preview-dispose",
        sessionId: activeSession,
      }),
      window.location.origin
    );
    expect(bridge.frameVisible.value).toBe(true);
    dispatch(envelope("unity-web-preview-disposed"));
    await flush();
    expect(bridge.runtimeState.value).toMatchObject({
      visible: true,
      frameVisible: false,
      phase: "attention",
      sessionId: activeSession,
      failure: { code: "UNITY_DOWNLOAD_STALLED" },
      evidence: { kind: "unity-scene-bounds-log" },
      cleanup: "disposed",
    });
    expect(vi.getTimerCount()).toBe(0);
    await bridge.retry();
    expect(bridge.sessionId.value).not.toBe(activeSession);
    expect(bridge.failure.value).toBeNull();
  });

  it("allows only the last concurrent open and keeps a close during retry final", async () => {
    await bridge.open();
    const retryOne = bridge.retry();
    const retryTwo = bridge.retry();
    dispatch(envelope("unity-web-preview-disposed"));
    await Promise.all([retryOne, retryTwo]);
    expect(bridge.frameKey.value).toBe(2);
    const retryThree = bridge.retry();
    const closing = bridge.close();
    dispatch(envelope("unity-web-preview-disposed"));
    await Promise.all([retryThree, closing]);
    expect(bridge.stage.value).toBe("closed");
    expect(bridge.frameKey.value).toBe(2);
  });

  it("does not adapt native callbacks from a different Unity build or malformed native payload", async () => {
    const otherBuild = `sha256:${"1".repeat(64)}`;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...release, buildId: otherBuild }),
    });
    await bridge.open();
    dispatch(envelope("unity-web-preview-ready", { buildId: otherBuild }));
    dispatch(
      envelope("unity-web-preview-scene-forwarded", { buildId: otherBuild })
    );
    dispatch({
      type: "unity-web-preview-scene-running",
      message: "Scene is running",
    });
    expect(bridge.stage.value).toBe("loading_scene");
    const closing = bridge.close();
    dispatch(envelope("unity-web-preview-disposed", { buildId: otherBuild }));
    await closing;
    await bridge.open();
    ready();
    forwarded();
    dispatch({
      type: "unity-web-preview-scene-running",
      message: { attacker: true },
    });
    expect(bridge.stage.value).toBe("loading_scene");
  });

  it("tracks measured bytes, rejects invalid totals, and does not extend timeout for repeated values", async () => {
    await bridge.open();
    const state = (progress: unknown) =>
      dispatch(
        envelope("unity-web-preview-state", {
          stage: "downloading_runtime",
          progress,
        })
      );
    state({ kind: "bytes", loaded: 100, total: 200 });
    expect(bridge.progress.value).toMatchObject({
      kind: "bytes",
      loaded: 100,
      total: 200,
    });
    await vi.advanceTimersByTimeAsync(80000);
    state({ kind: "bytes", loaded: 100, total: 200 });
    await vi.advanceTimersByTimeAsync(10000);
    expect(bridge.failure.value?.code).toBe("DOWNLOAD_STALLED");
    await finishClose();
    await bridge.open();
    state({ kind: "bytes", loaded: 100, total: 0 });
    expect(bridge.progress.value.kind).toBe("indeterminate");
  });

  it("identifies per-artifact byte progress and resets the download watchdog when the next artifact starts", async () => {
    await bridge.open();
    const state = (progress: unknown) =>
      dispatch(
        envelope("unity-web-preview-state", {
          stage: "downloading_runtime",
          progress,
        })
      );
    state({
      kind: "bytes",
      loaded: 200,
      total: 200,
      artifact: "data",
      unit: "decoded-response-bytes",
    });
    await vi.advanceTimersByTimeAsync(80000);
    state({
      kind: "bytes",
      loaded: 0,
      total: 100,
      artifact: "wasm",
      unit: "decoded-response-bytes",
    });
    expect(bridge.progress.value).toMatchObject({
      artifact: "wasm",
      unit: "decoded-response-bytes",
      loaded: 0,
    });
    await vi.advanceTimersByTimeAsync(10000);
    expect(bridge.failure.value).toBeNull();
    await vi.advanceTimersByTimeAsync(80000);
    expect(bridge.failure.value?.code).toBe("DOWNLOAD_STALLED");
  });

  it("keeps diagnostics structured and omits runner text that may contain private URLs", async () => {
    await bridge.open();
    dispatch(
      envelope("unity-web-preview-error", {
        code: "WGP-UNITY-LOADER",
        message: "token=private-secret",
      })
    );
    expect(bridge.failure.value).toMatchObject({
      code: "WGP-UNITY-LOADER",
      stage: "downloading_runtime",
    });
    expect(JSON.stringify(bridge.runtimeState.value)).not.toContain(
      "private-secret"
    );
    ready();
    expect(bridge.phase.value).toBe("attention");
  });

  it.each([
    { entrypoint: "https://webgl-preview.plugins.xrugc.com/embed.html" },
    { entrypoint: "/webgl-preview/releases/../embed.html" },
    { runtimeReleaseId: "../../login" },
    { buildId: "unverified-build" },
  ])("does not mount an iframe for invalid metadata %j", async (fields) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...release, ...fields }),
    });
    await bridge.open();
    expect(bridge.frameVisible.value).toBe(false);
    expect(bridge.failure.value?.code).toBe("RUNTIME_METADATA_INVALID");
  });
});
