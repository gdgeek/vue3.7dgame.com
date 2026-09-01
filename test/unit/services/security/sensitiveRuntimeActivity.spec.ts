import { describe, expect, it, vi } from "vitest";

import {
  currentSensitiveRuntimeActivityEpoch,
  signalSensitiveRuntimeActivity,
  subscribeSensitiveRuntimeActivity,
} from "@/services/security/sensitiveRuntimeActivity";

describe("synchronous security-sensitive runtime activity", () => {
  it("emits a synchronous payload-free monotonic epoch and supports idempotent unsubscribe", () => {
    const before = currentSensitiveRuntimeActivityEpoch();
    const observed: number[] = [];
    let returned = false;
    const unsubscribe = subscribeSensitiveRuntimeActivity((epoch) => {
      expect(returned).toBe(false);
      observed.push(epoch);
    });

    const emitted = signalSensitiveRuntimeActivity();
    returned = true;

    expect(emitted).toBeGreaterThan(before);
    expect(observed).toEqual([emitted]);
    unsubscribe();
    unsubscribe();
    signalSensitiveRuntimeActivity();
    expect(observed).toEqual([emitted]);
  });

  it("isolates listener failures from the originating operation and other listeners", () => {
    const throwing = subscribeSensitiveRuntimeActivity(() => {
      throw new Error("TEST_ONLY_LISTENER_FAILURE");
    });
    const survivor = vi.fn();
    const unsubscribeSurvivor = subscribeSensitiveRuntimeActivity(survivor);

    expect(() => signalSensitiveRuntimeActivity()).not.toThrow();
    expect(survivor).toHaveBeenCalledOnce();
    expect(survivor.mock.calls[0]).toHaveLength(1);
    expect(survivor.mock.calls[0][0]).toEqual(expect.any(Number));

    throwing();
    unsubscribeSurvivor();
  });
});
