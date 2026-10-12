import { bindOperationPreview, operationForSignal } from "./operation-context";
/** Page-local, bounded storage. Reading never evicts a valid draft. */
export const createDraftStore = <T extends { expiresAt: number }>(
  capacity: number
) => {
  const entries = new Map<string, T>();
  const prune = () => {
    for (const [id, draft] of entries) {
      if (draft.expiresAt <= Date.now()) entries.delete(id);
    }
  };
  return {
    prune,
    set(id: string, draft: T) {
      prune();
      while (!entries.has(id) && entries.size >= capacity) {
        entries.delete(entries.keys().next().value!);
      }
      // Tool results must not retain references to the approved proposal.
      entries.set(id, structuredClone(draft));
    },
    take(id: string) {
      prune();
      const draft = entries.get(id);
      entries.delete(id);
      return draft;
    },
    delete: (id: string) => entries.delete(id),
  };
};

const awaitConfirmation = (
  decision: Promise<boolean>,
  signal?: AbortSignal
) => {
  if (!signal) return decision;
  return new Promise<boolean>((resolve, reject) => {
    const abort = () =>
      reject(signal.reason ?? new DOMException("页面已关闭", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    decision
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
};

/** Consume synchronously, then revalidate after the asynchronous user decision. */
export const confirmDraft = async <
  P,
  T extends { preview: P; expiresAt: number },
>(
  store: { take: (id: string) => T | undefined },
  draftId: string,
  options: {
    confirm: (preview: P) => Promise<boolean>;
    isCurrent: (preview: P) => boolean;
    changedStatus: string;
    signal?: AbortSignal;
  }
): Promise<
  | { ok: true; draft: T }
  | { ok: false; result: { status: string; draftId: string } }
> => {
  options.signal?.throwIfAborted();
  const draft = store.take(draftId);
  const reject = (status: string) => ({
    ok: false as const,
    result: { status, draftId },
  });
  if (!draft) return reject("expired_or_missing");
  if (!options.isCurrent(draft.preview)) return reject(options.changedStatus);
  if (
    !(await awaitConfirmation(
      options.confirm(structuredClone(draft.preview)),
      options.signal
    ))
  )
    return reject("cancelled");
  options.signal?.throwIfAborted();
  if (draft.expiresAt <= Date.now()) return reject("expired_or_missing");
  if (!options.isCurrent(draft.preview)) return reject(options.changedStatus);
  bindOperationPreview(draft.preview, options.signal);
  operationForSignal(options.signal)?.phase("executing");
  return { ok: true, draft };
};
