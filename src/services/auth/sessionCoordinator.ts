/** Only opaque revisions are shared here; credentials remain in the existing token store. */
export interface SessionCoordinator {
  epoch(): string;
  advanceEpoch(): string;
  changed(): void;
  subscribe(listener: () => void): () => void;
  lock<T>(action: () => Promise<T>): Promise<T>;
  destroy(): void;
}

const STATE_KEY = "xrugc-auth-session-v1";
const LOCK_NAME = "xrugc-auth-refresh-v1";
const queues = new Map<string, Promise<unknown>>();

export function createSessionCoordinator(shared = true): SessionCoordinator {
  let state = { epoch: "initial", revision: "initial" };
  const listeners = new Set<() => void>();
  const id = () => globalThis.crypto.randomUUID();
  const read = () => {
    if (shared) {
      try {
        const value = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
        if (
          typeof value?.epoch === "string" &&
          typeof value?.revision === "string"
        )
          state = value;
      } catch {
        /* Storage can be unavailable in private or embedded contexts. */
      }
    }
    return state;
  };
  const write = () => {
    if (shared) {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
      } catch {
        /* Use this page's state. */
      }
    }
  };
  const storage = (event: StorageEvent) => {
    if (event.key !== STATE_KEY) return;
    read();
    try {
      if (
        event.oldValue &&
        event.newValue &&
        JSON.parse(event.oldValue).revision ===
          JSON.parse(event.newValue).revision
      )
        return;
    } catch {
      /* A malformed notification can only trigger a fresh store read. */
    }
    listeners.forEach((listener) => listener());
  };
  if (shared && typeof window !== "undefined")
    window.addEventListener("storage", storage);

  async function crossTabLock<T>(action: () => Promise<T>): Promise<T> {
    if (shared && typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request(LOCK_NAME, action);
    }
    // Browsers without Web Locks still get page-local single flight. The server's
    // atomic refresh/replay contract handles races between legacy/unsupported tabs.
    return action();
  }

  return {
    epoch: () => read().epoch,
    advanceEpoch: () => {
      state = { epoch: id(), revision: read().revision };
      write();
      return state.epoch;
    },
    changed: () => {
      state = { ...read(), revision: id() };
      write();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    lock: <T>(action: () => Promise<T>) => {
      const key = shared ? LOCK_NAME : id();
      const previous = queues.get(key) ?? Promise.resolve();
      const next = previous
        .catch(() => undefined)
        .then(() => crossTabLock(action));
      queues.set(key, next);
      void next
        .finally(() => {
          if (queues.get(key) === next) queues.delete(key);
        })
        .catch(() => undefined);
      return next;
    },
    destroy: () => {
      if (shared && typeof window !== "undefined")
        window.removeEventListener("storage", storage);
      listeners.clear();
    },
  };
}
