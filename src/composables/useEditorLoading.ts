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
  };
  const start = () => {
    stop();
    if (!active) return;
    status.value = "loading";
    error.value = null;
    const current = generation;
    deadline = setTimeout(() => fail("timeout"), options.timeoutMs ?? 60000);
    const check = async () => {
      if (current !== generation || !options.initialized()) return;
      try {
        const state = await options.probe();
        if (current !== generation) return;
        if (state.ok === true && state.loading === false) {
          stop();
          status.value = "ready";
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
  return { ready, status, error, getState, fail, restart: start };
}
