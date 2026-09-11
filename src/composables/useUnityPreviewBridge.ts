import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import env from "@/environment";
import { logger } from "@/utils/logger";
import {
  cloneForUnityPreview,
  rewriteUnityPreviewUrls,
  summarizeUnityPreviewPayload,
} from "@/utils/unityPreviewPayload";
import {
  readUnityRuntimeProgress,
  readUnityRuntimeRelease,
  unityRuntimeFailures,
  unityRuntimeStageLabels,
  type UnityRuntimeFailure,
  type UnityRuntimeProgress,
  type UnityRuntimeRelease,
  type UnityRuntimeStage,
} from "@/services/unity/runtime";
import type UnityPreviewDialog from "@/components/UnityPreviewDialog.vue";

type MaybePromise<T> = T | Promise<T>;
type UseUnityPreviewBridgeOptions = {
  buildPayload: () => MaybePromise<unknown>;
  ensureRuntimeData?: (signal?: AbortSignal) => MaybePromise<void>;
  canOpen?: () => true | string;
  notifyError: (message: string) => void;
};

const stageTimeouts: Partial<Record<UnityRuntimeStage, [number, string]>> = {
  preparing: [30000, "PREPARATION_TIMEOUT"],
  downloading_runtime: [90000, "DOWNLOAD_STALLED"],
  initializing_runtime: [120000, "INITIALIZATION_TIMEOUT"],
  loading_scene: [120000, "SCENE_CONFIRMATION_TIMEOUT"],
};
const orderedStages: UnityRuntimeStage[] = [
  "preparing",
  "downloading_runtime",
  "initializing_runtime",
  "loading_scene",
  "running",
];
const disposeTimeoutMs = 5000;

/** One controller owns the iframe, UI and WebMCP state for a scene page. */
export const useUnityPreviewBridge = ({
  buildPayload,
  ensureRuntimeData,
  canOpen,
  notifyError,
}: UseUnityPreviewBridgeOptions) => {
  const dialogRef = ref<InstanceType<typeof UnityPreviewDialog> | null>(null);
  const visible = ref(false);
  const frameVisible = ref(false);
  const ready = ref(false);
  const frameKey = ref(0);
  const sessionId = ref("");
  const release = ref<UnityRuntimeRelease | null>(null);
  const stage = ref<UnityRuntimeStage>("closed");
  const progress = ref<UnityRuntimeProgress>({ kind: "indeterminate" });
  const failure = ref<UnityRuntimeFailure | null>(null);
  const evidence = ref<{ kind: string } | null>(null);
  const cleanup = ref<"none" | "disposed" | "timeout" | "frame-unavailable">(
    "none"
  );
  const panMode = ref(false);
  // Prepared scene JSON must stay plain: deep ref() would wrap it in a Proxy
  // that the browser cannot serialize through Window.postMessage.
  const pendingPayload = shallowRef<unknown>(null);
  const elapsedSeconds = ref(0);
  let startedAt = 0;
  let requestId = 0;
  let destroyed = false;
  let preparation: AbortController | null = null;
  let watchdog: number | undefined;
  let elapsedTimer: number | undefined;
  let disposeTimer: number | undefined;
  let acknowledgeDisposed: (() => void) | null = null;
  let stopping: Promise<void> | null = null;
  let preserveErrorAfterDispose = false;
  let payloadSent = false;
  let sceneForwarded = false;
  let pendingNativeRunning = false;

  const status = computed(
    () => failure.value?.message ?? unityRuntimeStageLabels[stage.value]
  );
  const phase = computed<
    "closed" | "loading" | "ready" | "running" | "attention"
  >(() => {
    if (stage.value === "closed") return "closed";
    if (stage.value === "error") return "attention";
    if (stage.value === "running") return "running";
    if (stage.value === "loading_scene" && ready.value) return "ready";
    return "loading";
  });
  const src = computed(() => {
    if (!release.value || !sessionId.value) return "";
    const url = new URL(release.value.entrypoint, window.location.origin);
    url.searchParams.set("embed", "1");
    url.searchParams.set("sessionId", sessionId.value);
    url.searchParams.set("session", sessionId.value);
    url.searchParams.set("runtimeReleaseId", release.value.runtimeReleaseId);
    url.searchParams.set("buildId", release.value.buildId);
    return url.href;
  });
  const runtimeState = computed(() => ({
    visible: visible.value,
    frameVisible: frameVisible.value,
    ready: ready.value,
    phase: phase.value,
    status: status.value,
    stage: stage.value,
    sessionId: sessionId.value || null,
    runtimeReleaseId: release.value?.runtimeReleaseId ?? null,
    buildId: release.value?.buildId ?? null,
    progress: { ...progress.value },
    failure: failure.value ? { ...failure.value } : null,
    evidence: evidence.value ? { ...evidence.value } : null,
    cleanup: cleanup.value,
    elapsedSeconds: elapsedSeconds.value,
  }));

  const clearWatchdog = () => {
    if (watchdog !== undefined) window.clearTimeout(watchdog);
    watchdog = undefined;
  };
  const clearTimers = () => {
    clearWatchdog();
    if (elapsedTimer !== undefined) window.clearInterval(elapsedTimer);
    elapsedTimer = undefined;
  };
  const fail = (code: string) => {
    if (["closed", "stopping", "error"].includes(stage.value)) return;
    const safeCode = Object.hasOwn(unityRuntimeFailures, code)
      ? code
      : "RUNTIME_ERROR";
    failure.value = {
      code: safeCode,
      stage: stage.value,
      message: unityRuntimeFailures[safeCode],
    };
    pendingNativeRunning = false;
    stage.value = "error";
    progress.value = { kind: "indeterminate" };
    preparation?.abort();
    clearTimers();
    void disposeActive(true);
  };
  const armWatchdog = () => {
    clearWatchdog();
    const timeout = stageTimeouts[stage.value];
    if (timeout)
      watchdog = window.setTimeout(() => fail(timeout[1]), timeout[0]);
  };
  const moveTo = (next: UnityRuntimeStage) => {
    if (stage.value === next) return;
    stage.value = next;
    progress.value = { kind: "indeterminate" };
    armWatchdog();
  };
  const isCurrent = (operation: number, session: string) =>
    !destroyed &&
    operation === requestId &&
    session === sessionId.value &&
    !["closed", "stopping", "error"].includes(stage.value);
  const post = (message: Record<string, unknown>) => {
    if (!sessionId.value || !release.value) return false;
    try {
      return (
        dialogRef.value?.postMessage(
          {
            ...message,
            protocolVersion: 1,
            sessionId: sessionId.value,
            runtimeReleaseId: release.value.runtimeReleaseId,
            buildId: release.value.buildId,
          },
          window.location.origin
        ) ?? false
      );
    } catch {
      // Callers turn failed delivery into their bounded cleanup/error path.
      // Do not log the payload or native exception, which can include scene URLs.
      return false;
    }
  };

  const preparePayload = (payload: unknown) => {
    const postablePayload = cloneForUnityPreview(payload);
    try {
      const assetOrigin = new URL(env.api, window.location.origin).origin;
      rewriteUnityPreviewUrls(
        postablePayload,
        window.location.origin,
        assetOrigin,
        { restrictToRuntimeOrigins: true }
      );
    } catch {
      throw new Error("SCENE_ASSET_ORIGIN_DENIED");
    }
    return postablePayload;
  };
  const postPayload = (payload: unknown) => {
    if (!ready.value || payloadSent) return;
    if (!post({ type: "xrugc-load-scene-json", payload })) {
      fail("SCENE_FORWARD_FAILED");
      return;
    }
    payloadSent = true;
    moveTo("loading_scene");
    logger.log(
      "[UnityPreview] scene payload sent",
      summarizeUnityPreviewPayload(payload)
    );
  };
  const send = async () => {
    const operation = requestId;
    const session = sessionId.value;
    if (!isCurrent(operation, session) || payloadSent) return;
    try {
      await ensureRuntimeData?.(preparation?.signal);
      if (!isCurrent(operation, session)) return;
      const payload = await buildPayload();
      if (!isCurrent(operation, session)) return;
      pendingPayload.value = preparePayload(payload);
      postPayload(pendingPayload.value);
    } catch (error) {
      if (isCurrent(operation, session))
        fail(
          error instanceof Error &&
            error.message === "SCENE_ASSET_ORIGIN_DENIED"
            ? error.message
            : "SCENE_PAYLOAD_FAILED"
        );
    }
  };

  const confirmRunning = () => {
    pendingNativeRunning = false;
    evidence.value = { kind: "unity-scene-started-callback" };
    moveTo("running");
    clearTimers();
    post({
      type: "unity-web-preview-runtime-confirmed",
      evidence: {
        kind: "unity-scene-started-callback",
        sceneAccepted: true,
        runtimeStarted: true,
      },
    });
  };
  const handleMessage = (event: MessageEvent) => {
    if (!frameVisible.value || !sessionId.value || !release.value) return;
    if (!dialogRef.value?.isFrameSource(event.source)) return;
    if (event.origin !== window.location.origin) return;
    const message = event.data;
    // This exact locked Unity build posts its native lifecycle event directly to
    // parent, without the runner envelope. Bind only this event to this iframe's
    // one payload; any version/session-bearing message must pass strict checks.
    if (
      message &&
      typeof message === "object" &&
      message.type === "unity-web-preview-scene-running" &&
      (message.message === undefined || typeof message.message === "string") &&
      Object.keys(message).every(
        (key) => key === "type" || key === "message"
      ) &&
      release.value.buildId ===
        "sha256:7bee87bbf1c044802841b46489638cb5069eac5b51fb0637714a3b826b092f33" &&
      stage.value === "loading_scene" &&
      ready.value &&
      payloadSent
    ) {
      // Unity may post synchronously inside SendMessage, before the runner's
      // forwarded event. Keep this evidence private until that delivery arrives.
      if (sceneForwarded) confirmRunning();
      else pendingNativeRunning = true;
      return;
    }
    if (
      !message ||
      typeof message !== "object" ||
      message.protocolVersion !== 1 ||
      message.sessionId !== sessionId.value ||
      message.runtimeReleaseId !== release.value.runtimeReleaseId ||
      message.buildId !== release.value.buildId
    )
      return;

    if (message.type === "unity-web-preview-disposed") {
      acknowledgeDisposed?.();
      return;
    }
    if (["closed", "stopping", "error"].includes(stage.value)) return;
    if (
      message.type === "unity-web-preview-error" ||
      (message.type === "unity-web-preview-state" && message.stage === "error")
    ) {
      fail(
        typeof message.failure?.code === "string"
          ? message.failure.code
          : String(message.code)
      );
      return;
    }
    if (message.type === "unity-web-preview-ready") {
      if (ready.value) return;
      ready.value = true;
      postPayload(pendingPayload.value);
      if (stage.value === "error") return;
      post({
        type: "unity-web-preview-camera-mode",
        mode: panMode.value ? "pan" : "orbit",
      });
      return;
    }
    if (message.type === "unity-web-preview-scene-forwarded" && payloadSent) {
      sceneForwarded = true;
      if (pendingNativeRunning && stage.value === "loading_scene")
        confirmRunning();
      return;
    }
    if (message.type === "unity-web-preview-scene-visible") {
      // The historical signal matches console text; it cannot confirm script/resource success.
      if (stage.value !== "running")
        evidence.value = { kind: "unity-scene-bounds-log" };
      return;
    }
    if (
      (message.type === "unity-web-preview-scene-running" ||
        (message.type === "unity-web-preview-state" &&
          message.stage === "running")) &&
      payloadSent &&
      message.evidence?.kind === "unity-scene-started-callback" &&
      message.evidence.sceneAccepted === true &&
      message.evidence.runtimeStarted === true
    ) {
      if (sceneForwarded && stage.value === "loading_scene") confirmRunning();
      return;
    }
    if (message.type === "unity-web-preview-state") {
      const next = message.stage as UnityRuntimeStage;
      if (
        !orderedStages.includes(next) ||
        next === "running" ||
        orderedStages.indexOf(next) < orderedStages.indexOf(stage.value)
      )
        return;
      const measured = readUnityRuntimeProgress(message.progress);
      const advanced =
        next !== stage.value ||
        (measured.kind === "bytes" &&
          ((Boolean(measured.artifact) &&
            measured.artifact !== progress.value.artifact) ||
            (measured.loaded ?? 0) > (progress.value.loaded ?? 0)));
      moveTo(next);
      progress.value = measured;
      // Only actual download advancement extends the no-progress deadline.
      if (advanced && next === "downloading_runtime") armWatchdog();
      return;
    }
  };

  const clearSession = () => {
    frameVisible.value = false;
    visible.value = false;
    ready.value = false;
    sessionId.value = "";
    release.value = null;
    pendingPayload.value = null;
    payloadSent = false;
    sceneForwarded = false;
    pendingNativeRunning = false;
    stage.value = "closed";
    progress.value = { kind: "indeterminate" };
    failure.value = null;
    evidence.value = null;
    panMode.value = false;
  };
  const disposeActive = (preserveError = false): Promise<void> => {
    preparation?.abort();
    preparation = null;
    clearTimers();
    pendingNativeRunning = false;
    preserveErrorAfterDispose = preserveError;
    if (stopping) return stopping;
    if (!frameVisible.value) {
      if (!preserveError) clearSession();
      return Promise.resolve();
    }
    if (!preserveError) moveTo("stopping");
    const disposed = new Promise<void>((resolve) => {
      let finished = false;
      const finish = (result: typeof cleanup.value) => {
        if (finished) return;
        finished = true;
        if (disposeTimer !== undefined) window.clearTimeout(disposeTimer);
        disposeTimer = undefined;
        acknowledgeDisposed = null;
        cleanup.value = result;
        resolve();
      };
      acknowledgeDisposed = () => finish("disposed");
      disposeTimer = window.setTimeout(
        () => finish("timeout"),
        disposeTimeoutMs
      );
      if (!post({ type: "unity-web-preview-dispose" }))
        finish("frame-unavailable");
    });
    stopping = disposed.then(() => {
      if (preserveErrorAfterDispose) {
        frameVisible.value = false;
        ready.value = false;
        pendingPayload.value = null;
        payloadSent = false;
        sceneForwarded = false;
      } else {
        clearSession();
      }
      stopping = null;
    });
    return stopping;
  };
  const close = async () => {
    requestId += 1;
    await disposeActive();
  };
  const open = async () => {
    const openResult = canOpen?.() ?? true;
    if (openResult !== true) {
      notifyError(openResult);
      return;
    }
    const operation = ++requestId;
    await disposeActive();
    if (destroyed || operation !== requestId) return;
    const nonce =
      typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : Array.from(
            globalThis.crypto.getRandomValues(new Uint32Array(4)),
            (value) => value.toString(16).padStart(8, "0")
          ).join("");
    const session = `unity-preview-${nonce}`;
    sessionId.value = session;
    cleanup.value = "none";
    visible.value = true;
    preparation = new AbortController();
    startedAt = Date.now();
    elapsedSeconds.value = 0;
    elapsedTimer = window.setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
    moveTo("preparing");
    try {
      const [runtimeRelease] = await Promise.all([
        readUnityRuntimeRelease(preparation.signal),
        ensureRuntimeData?.(preparation.signal),
      ]);
      if (!isCurrent(operation, session)) return;
      const payload = await buildPayload();
      if (!isCurrent(operation, session)) return;
      release.value = runtimeRelease;
      // Reject unsupported resource origins before mounting/downloading Unity.
      pendingPayload.value = preparePayload(payload);
      frameKey.value += 1;
      frameVisible.value = true;
      moveTo("downloading_runtime");
    } catch (error) {
      if (!isCurrent(operation, session)) return;
      const code = error instanceof Error ? error.message : "";
      fail(
        code.startsWith("RUNTIME_METADATA_") ||
          code === "SCENE_ASSET_ORIGIN_DENIED"
          ? code
          : "SCENE_PAYLOAD_FAILED"
      );
    }
  };
  const handleLoad = () => {
    /* iframe load alone does not prove Unity readiness. */
  };

  onMounted(() => window.addEventListener("message", handleMessage));
  onBeforeUnmount(() => {
    destroyed = true;
    requestId += 1;
    // Route guards await close(). Unexpected owner removal still requests Quit.
    void disposeActive();
    window.removeEventListener("message", handleMessage);
  });

  return {
    dialogRef,
    visible,
    frameVisible,
    ready,
    status,
    failure,
    frameKey,
    panMode,
    pendingPayload,
    src,
    stage,
    progress,
    sessionId,
    release,
    elapsedSeconds,
    runtimeState,
    phase,
    open,
    retry: open,
    close,
    send,
    handleLoad,
    handleClosed: close,
  };
};
