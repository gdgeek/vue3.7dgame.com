import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useSceneSaveGuard } from "@/composables/useSceneSaveGuard";

const setup = () => {
  let sequence = 0;
  const pendingRequests = new Map<
    string,
    (payload: Record<string, unknown>) => void
  >();
  const sendRequest = vi.fn(
    (action: string): string | undefined => `${action}-${++sequence}`
  );
  const confirmDialog = vi.fn(() => Promise.reject("close"));
  const confirmManualSaveDialog = vi.fn<() => Promise<unknown>>(() =>
    Promise.resolve()
  );
  const pendingRestorePayload = ref<unknown>(null);
  const guard = useSceneSaveGuard({
    sendRequest,
    pendingRequests,
    pendingRestorePayload,
    isSavingVersion: ref(false),
    confirmDialog,
    confirmManualSaveDialog,
  });
  const respond = (requestId: string, changed: boolean) => {
    const resolver = pendingRequests.get(requestId);
    expect(resolver).toBeDefined();
    resolver!({ changed });
  };
  const latestRequest = () => sendRequest.mock.results.at(-1)!.value as string;
  const poll = async (changed: boolean) => {
    const pending = guard.syncUnsavedChangesForBeforeUnload();
    respond(latestRequest(), changed);
    await pending;
  };
  return {
    guard,
    sendRequest,
    confirmDialog,
    confirmManualSaveDialog,
    pendingRestorePayload,
    pendingRequests,
    respond,
    latestRequest,
    poll,
  };
};

describe("useSceneSaveGuard persistence state", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("preserves known dirty state when the iframe query times out", async () => {
    const { guard, poll, pendingRequests } = setup();
    await poll(true);
    const pending = guard.syncUnsavedChangesForBeforeUnload();
    await vi.advanceTimersByTimeAsync(1200);
    await pending;
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
    expect(pendingRequests.size).toBe(0);
  });

  it("preserves known dirty state when a query cannot be sent", async () => {
    const { guard, sendRequest } = setup();
    guard.hasUnsavedChangesBeforeUnload.value = true;
    sendRequest.mockReturnValueOnce(undefined);
    await guard.syncUnsavedChangesForBeforeUnload();
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
  });

  it("keeps an unconfirmed write dirty through false notifications and timeout", async () => {
    const { guard, poll } = setup();
    guard.markPersistenceUnverified();
    guard.hasUnsavedChangesBeforeUnload.value = false;
    await poll(false);
    expect(guard.hasUnconfirmedPersistence.value).toBe(true);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);

    const pending = guard.syncUnsavedChangesForBeforeUnload();
    await vi.advanceTimersByTimeAsync(1200);
    await pending;
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
  });

  it("clears the persistence latch only after acknowledged saving", async () => {
    const { guard, poll } = setup();
    guard.markPersistenceUnverified();
    await poll(false);
    guard.markPersistenceAcknowledged();
    expect(guard.hasUnconfirmedPersistence.value).toBe(false);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(false);
    await poll(false);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(false);
  });

  it("does not let a pre-save query dirty an acknowledged scene again", async () => {
    const { guard, respond, latestRequest } = setup();
    guard.markPersistenceUnverified();
    const pending = guard.syncUnsavedChangesForBeforeUnload();
    const requestId = latestRequest();
    guard.markPersistenceAcknowledged();
    respond(requestId, true);
    await pending;
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(false);
  });

  it("allows false iframe state to clear ordinary editor changes", async () => {
    const { guard, poll } = setup();
    await poll(true);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
    await poll(false);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(false);
  });

  it("keeps a pending restore dirty even after saving acknowledgement", () => {
    const { guard, pendingRestorePayload } = setup();
    pendingRestorePayload.value = { verse: {} };
    guard.markPersistenceUnverified();
    guard.markPersistenceAcknowledged();
    guard.hasUnsavedChangesBeforeUnload.value = false;
    expect(guard.hasUnconfirmedPersistence.value).toBe(false);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
  });

  it.each(["unconfirmed write", "pending restore"])(
    "asks before leaving with %s despite an unchanged iframe",
    async (reason) => {
      const {
        guard,
        pendingRestorePayload,
        respond,
        latestRequest,
        confirmDialog,
      } = setup();
      if (reason === "unconfirmed write") guard.markPersistenceUnverified();
      else pendingRestorePayload.value = { verse: {} };
      const pending = guard.resolveUnsavedBeforeLeave();
      respond(latestRequest(), false);
      expect(await pending).toBe(false);
      expect(confirmDialog).toHaveBeenCalledOnce();
      expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
    }
  );

  it("resets the target without letting the old poll clear a new poll", async () => {
    const { guard, respond, latestRequest, sendRequest } = setup();
    guard.markPersistenceUnverified();
    const oldPoll = guard.syncUnsavedChangesForBeforeUnload();
    const oldRequest = latestRequest();

    guard.resetUnsavedState();
    expect(guard.hasUnconfirmedPersistence.value).toBe(false);
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(false);
    const newPoll = guard.syncUnsavedChangesForBeforeUnload();
    const newRequest = latestRequest();
    respond(oldRequest, true);
    await oldPoll;
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(false);

    await guard.syncUnsavedChangesForBeforeUnload();
    expect(sendRequest).toHaveBeenCalledTimes(2);
    respond(newRequest, true);
    await newPoll;
    expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
  });
});

describe("manual scene save confirmation", () => {
  it.each(["cancel", "close"])(
    "preserves edits without saving on %s",
    async (action) => {
      const {
        guard,
        sendRequest,
        confirmManualSaveDialog,
        pendingRestorePayload,
      } = setup();
      pendingRestorePayload.value = { meta: { title: "unsaved" } };
      guard.hasUnsavedChangesBeforeUnload.value = true;
      confirmManualSaveDialog.mockRejectedValueOnce(action);
      expect(await guard.requestManualSceneSave()).toBe(false);
      expect(sendRequest).not.toHaveBeenCalled();
      expect(guard.hasUnsavedChangesBeforeUnload.value).toBe(true);
      expect(pendingRestorePayload.value).toEqual({
        meta: { title: "unsaved" },
      });
    }
  );

  it("shares a single confirmation and save across repeated entry points", async () => {
    const { guard, sendRequest, confirmManualSaveDialog } = setup();
    let confirm!: () => void;
    confirmManualSaveDialog.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          confirm = resolve;
        })
    );
    const first = guard.requestManualSceneSave();
    expect(guard.requestManualSceneSave()).toBe(first);
    expect(confirmManualSaveDialog).toHaveBeenCalledOnce();
    expect(sendRequest).not.toHaveBeenCalled();
    // A timer must not save behind the open confirmation window.
    expect(await guard.requestSceneSave("auto")).toBe(false);
    confirm();
    await Promise.resolve();
    expect(sendRequest).toHaveBeenCalledOnce();
    expect(sendRequest).toHaveBeenCalledWith("save-before-leave");
    guard.resolveLeaveSave(true);
    expect(await first).toBe(true);
  });

  it.each(["resetUnsavedState", "cleanupPendingResolver"] as const)(
    "does not save a stale target after %s",
    async (reset) => {
      const { guard, sendRequest, confirmManualSaveDialog } = setup();
      let confirm!: () => void;
      confirmManualSaveDialog.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            confirm = resolve;
          })
      );
      const pending = guard.requestManualSceneSave();
      guard[reset]();
      confirm();
      expect(await pending).toBe(false);
      expect(sendRequest).not.toHaveBeenCalled();
    }
  );

  it("can confirm and save after cancelling an earlier attempt", async () => {
    const { guard, sendRequest, confirmManualSaveDialog } = setup();
    confirmManualSaveDialog.mockRejectedValueOnce("cancel");
    expect(await guard.requestManualSceneSave()).toBe(false);
    const pending = guard.requestManualSceneSave();
    await Promise.resolve();
    expect(sendRequest).toHaveBeenCalledOnce();
    expect(sendRequest).toHaveBeenCalledWith("save-before-leave");
    guard.resolveLeaveSave(true);
    expect(await pending).toBe(true);
  });
});
