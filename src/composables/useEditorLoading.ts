import {
  emptyEditorProgress,
  parseEditorLoadProgress,
  type EditorLoadPhase,
} from "@/utils/editorLoadProgress";
import {
  computed,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  watch,
} from "vue";

/** INIT delivery only permits RPC; a live snapshot confirms asset loading finished. */
export function useEditorLoading(options: {
  initialized: () => boolean;
  target: () => unknown;
  probe: () => Promise<Record<string, unknown>>;
  timeoutMs?: number;
}) {
  const status = ref<"loading" | "ready" | "error">("loading");
  const error = ref<string | null>(null);
  const progress = ref(emptyEditorProgress("connecting"));
  let generation = 0;
  let active = true;
  let poll: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    generation++;
    clearTimeout(poll);
    clearTimeout(deadline);
  };
  const fail = (message: string) => {
    stop();
    error.value = message;
    status.value = "error";
    progress.value = { ...progress.value, phase: "error" };
  };
  const start = () => {
    stop();
    if (!active) return;
    status.value = "loading";
    error.value = null;
    progress.value = emptyEditorProgress(
      options.initialized() ? "initializing" : "connecting"
    );
    const current = generation;
    deadline = setTimeout(() => fail("timeout"), options.timeoutMs ?? 60000);
    const check = async () => {
      if (current !== generation || !options.initialized()) return;
      try {
        const state = await options.probe();
        if (current !== generation) return;
        const reported =
          state.ok === true
            ? parseEditorLoadProgress(state.loadProgress)
            : null;
        if (reported) progress.value = reported;
        else if (state.ok === true && state.loading === true)
          progress.value = emptyEditorProgress("assets");
        if (reported?.phase === "error") {
          fail("asset-load-failed");
          return;
        }
        if (
          state.ok === true &&
          state.loading === false &&
          (!reported || reported.phase === "ready")
        ) {
          stop();
          status.value = "ready";
          progress.value = { ...progress.value, phase: "ready" };
          return;
        }
        // INIT handlers can still be setting up loaders when the first RPC arrives.
      } catch {
        if (current !== generation) return;
      }
      poll = setTimeout(check, 500);
    };
    if (options.initialized()) poll = setTimeout(check, 0);
  };
  const ready = computed(
    () => options.initialized() && status.value === "ready"
  );
  const getState = () => ({
    ready: ready.value,
    loading: !ready.value && status.value !== "error",
    status: ready.value
      ? ("ready" as const)
      : status.value === "error"
        ? ("error" as const)
        : ("loading" as const),
    blocked: !ready.value,
    error: error.value,
    progress: { ...progress.value },
    retryAfterMs: status.value === "error" || ready.value ? null : 500,
  });
  watch([options.initialized, options.target], start, {
    immediate: true,
    flush: "sync",
  });
  onDeactivated(() => {
    active = false;
    stop();
  });
  onActivated(() => {
    if (!active) {
      active = true;
      start();
    }
  });
  onScopeDispose(() => {
    active = false;
    stop();
  });
  const setPhase = (phase: EditorLoadPhase) => {
    progress.value = emptyEditorProgress(phase);
  };
  return {
    ready,
    status,
    error,
    progress,
    setPhase,
    getState,
    fail,
    restart: start,
  };
}
