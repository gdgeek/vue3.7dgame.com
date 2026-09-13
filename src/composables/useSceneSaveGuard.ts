import { computed, ref, type Ref } from "vue";
import type { ScriptSaveTrigger } from "@/composables/useScriptEditorBase";

export interface UseSceneSaveGuardOptions {
  sendRequest: (
    action: string,
    data?: Record<string, unknown>
  ) => string | undefined;
  pendingRequests: Map<string, (payload: Record<string, unknown>) => void>;
  pendingRestorePayload: Ref<unknown>;
  isSavingVersion: Ref<boolean>;
  confirmDialog: () => Promise<unknown>;
  isEditorReady?: () => boolean;
  onBeforeSave?: (trigger: ScriptSaveTrigger) => void;
}

export function useSceneSaveGuard(options: UseSceneSaveGuardOptions) {
  const {
    sendRequest,
    pendingRequests,
    pendingRestorePayload,
    isSavingVersion,
    confirmDialog,
    isEditorReady,
    onBeforeSave,
  } = options;

  let pendingLeaveSaveResolver: ((result: boolean) => void) | null = null;
  const editorDirty = ref(false);
  const persistenceUnverified = ref(false);
  const hasUnconfirmedPersistence = computed(() => persistenceUnverified.value);
  const hasUnsavedChangesBeforeUnload = computed({
    get: () =>
      editorDirty.value ||
      persistenceUnverified.value ||
      Boolean(pendingRestorePayload.value),
    // Legacy editor notifications may clear editor state, never a failed save.
    set: (changed: boolean) => {
      editorDirty.value = changed;
    },
  });
  let stateVersion = 0;
  let pollingRequest: symbol | null = null;
  let pendingSceneSavePromise: Promise<boolean> | null = null;

  const markPersistenceUnverified = () => {
    stateVersion += 1;
    persistenceUnverified.value = true;
  };

  const markPersistenceAcknowledged = () => {
    stateVersion += 1;
    persistenceUnverified.value = false;
    editorDirty.value = false;
  };

  const resetUnsavedState = () => {
    markPersistenceAcknowledged();
    // A new target can poll immediately; old responses cannot update its state.
    pollingRequest = null;
  };

  const queryUnsavedChangesBeforeLeave = (): Promise<boolean> => {
    if (isEditorReady?.() === false)
      return Promise.resolve(hasUnsavedChangesBeforeUnload.value);
    const queryVersion = stateVersion;
    return new Promise((resolve) => {
      const requestId = sendRequest("check-unsaved-changes");
      if (!requestId) {
        resolve(hasUnsavedChangesBeforeUnload.value);
        return;
      }

      const timeout = window.setTimeout(() => {
        pendingRequests.delete(requestId);
        resolve(hasUnsavedChangesBeforeUnload.value);
      }, 1200);

      pendingRequests.set(requestId, (payload) => {
        window.clearTimeout(timeout);
        pendingRequests.delete(requestId);
        resolve(
          queryVersion !== stateVersion || typeof payload.changed !== "boolean"
            ? hasUnsavedChangesBeforeUnload.value
            : persistenceUnverified.value ||
                Boolean(pendingRestorePayload.value) ||
                payload.changed
        );
      });
    });
  };

  const syncUnsavedChangesForBeforeUnload = async () => {
    if (pollingRequest) return;

    const request = Symbol("unsaved-query");
    const queryVersion = stateVersion;
    pollingRequest = request;
    try {
      const changed = await queryUnsavedChangesBeforeLeave();
      if (queryVersion === stateVersion)
        hasUnsavedChangesBeforeUnload.value = changed;
    } finally {
      if (pollingRequest === request) pollingRequest = null;
    }
  };

  const waitForLeaveSaveResult = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        if (pendingLeaveSaveResolver) {
          pendingLeaveSaveResolver = null;
        }
        resolve(false);
      }, 3000);

      pendingLeaveSaveResolver = (result: boolean) => {
        window.clearTimeout(timeout);
        pendingLeaveSaveResolver = null;
        resolve(result);
      };
    });
  };

  const resolveLeaveSave = (result: boolean) => {
    if (!pendingLeaveSaveResolver) return;
    const resolver = pendingLeaveSaveResolver;
    pendingLeaveSaveResolver = null;
    resolver(result);
  };

  const requestSceneSave = (trigger: ScriptSaveTrigger) => {
    if (pendingSceneSavePromise) return pendingSceneSavePromise;
    if (isEditorReady?.() === false) return Promise.resolve(false);
    onBeforeSave?.(trigger);
    isSavingVersion.value = true;
    sendRequest("save-before-leave");
    pendingSceneSavePromise = waitForLeaveSaveResult().finally(() => {
      pendingSceneSavePromise = null;
      isSavingVersion.value = false;
    });
    return pendingSceneSavePromise;
  };

  const resolveUnsavedBeforeLeave = async (): Promise<boolean> => {
    const queryVersion = stateVersion;
    const changed = await queryUnsavedChangesBeforeLeave();
    if (queryVersion === stateVersion)
      hasUnsavedChangesBeforeUnload.value = changed;

    if (!hasUnsavedChangesBeforeUnload.value) {
      return true;
    }

    try {
      await confirmDialog();
    } catch (action) {
      if (action === "cancel") {
        return true;
      }
      return false;
    }

    return requestSceneSave("manual");
  };

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsavedChangesBeforeUnload.value) return;
    event.preventDefault();
    event.returnValue = "";
  };

  const cleanupPendingResolver = () => {
    if (pendingLeaveSaveResolver) {
      pendingLeaveSaveResolver(false);
      pendingLeaveSaveResolver = null;
    }
  };

  return {
    hasUnsavedChangesBeforeUnload,
    hasUnconfirmedPersistence,
    markPersistenceUnverified,
    markPersistenceAcknowledged,
    resetUnsavedState,
    queryUnsavedChangesBeforeLeave,
    syncUnsavedChangesForBeforeUnload,
    waitForLeaveSaveResult,
    resolveLeaveSave,
    requestSceneSave,
    resolveUnsavedBeforeLeave,
    handleBeforeUnload,
    cleanupPendingResolver,
  };
}
