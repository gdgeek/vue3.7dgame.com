export type SensitiveRuntimeActivityListener = (epoch: number) => void;

let activityEpoch = 0;
const listeners = new Set<SensitiveRuntimeActivityListener>();

/**
 * Emits a synchronous, payload-free security-sensitive activity signal.
 *
 * The epoch is monotonic and intentionally carries no activity category,
 * token, credential, user data, or other source value.
 */
export function signalSensitiveRuntimeActivity(): number {
  if (activityEpoch < Number.MAX_SAFE_INTEGER) activityEpoch += 1;
  const nextEpoch = activityEpoch;

  for (const listener of [...listeners]) {
    try {
      listener(nextEpoch);
    } catch {
      // A diagnostic listener must never change the originating operation.
    }
  }

  return nextEpoch;
}

export function currentSensitiveRuntimeActivityEpoch(): number {
  return activityEpoch;
}

export function subscribeSensitiveRuntimeActivity(
  listener: SensitiveRuntimeActivityListener
): () => void {
  listeners.add(listener);
  let subscribed = true;

  return () => {
    if (!subscribed) return;
    subscribed = false;
    listeners.delete(listener);
  };
}
