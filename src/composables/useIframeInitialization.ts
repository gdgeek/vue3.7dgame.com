import { ref } from "vue";

type FrameState = {
  frame: HTMLIFrameElement | null | undefined;
  window: Window | null | undefined;
  owner: number;
  src: string;
  frameKey: number;
};

export type IframeInitializationTicket = FrameState & {
  generation: number;
  request: number;
};

/** PLUGIN_READY means a document can receive INIT, not that it has received one. */
export function useIframeInitialization(options: {
  frame: () => HTMLIFrameElement | null | undefined;
  owner: () => number;
  src: () => string;
  frameKey: () => number;
  sendInit: (payload: unknown) => string | undefined;
}) {
  const ready = ref(false);
  let generation = 0;
  let request = 0;
  let documentId: string | null = null;
  let accepted: FrameState | null = null;

  const capture = (): FrameState => ({
    frame: options.frame(),
    window: options.frame()?.contentWindow,
    owner: options.owner(),
    src: options.src(),
    frameKey: options.frameKey(),
  });
  const matches = (state: FrameState) => {
    const current = capture();
    return Object.keys(current).every(
      (key) =>
        current[key as keyof FrameState] === state[key as keyof FrameState]
    );
  };
  const reset = () => {
    generation += 1;
    request += 1;
    accepted = null;
    documentId = null;
    ready.value = false;
  };
  const acceptReady = (payload: Record<string, unknown>) => {
    const nextDocumentId =
      typeof payload.documentId === "string" && payload.documentId.trim()
        ? payload.documentId
        : null;
    // A stable document nonce distinguishes reloads from duplicate notifications.
    // Older editors without a nonce remain supported once per known frame state.
    if (accepted && matches(accepted) && nextDocumentId === documentId) {
      return false;
    }
    reset();
    const state = capture();
    if (!state.window || !Number.isFinite(state.owner)) return false;
    accepted = state;
    documentId = nextDocumentId;
    return true;
  };
  const begin = (): IframeInitializationTicket | null => {
    if (!accepted || !matches(accepted)) return null;
    ready.value = false;
    return { ...capture(), generation, request: ++request };
  };
  const isCurrent = (ticket: IframeInitializationTicket) =>
    ticket.generation === generation &&
    ticket.request === request &&
    Boolean(accepted) &&
    matches(ticket);
  const send = (ticket: IframeInitializationTicket, payload: unknown) => {
    if (!isCurrent(ticket)) return false;
    const messageId = options.sendInit(payload);
    ready.value = Boolean(messageId) && isCurrent(ticket);
    return ready.value;
  };
  const isReady = () => ready.value && Boolean(accepted && matches(accepted));

  return { ready, reset, acceptReady, begin, isCurrent, send, isReady };
}
