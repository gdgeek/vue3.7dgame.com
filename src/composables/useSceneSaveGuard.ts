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
  confirmManualSaveDialog?: () => Promise<unknown>;
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
    confirmManualSaveDialog = confirmDialog,
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
  let targetVersion = 0;
  let pendingManualSave: Promise<boolean> | null = null;
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
    targetVersion += 1;
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
    if (trigger === "auto" && pendingManualSave) return Promise.resolve(false);
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

  // Toolbar and iframe menu saves share confirmation and persistence.
  const requestManualSceneSave = (): Promise<boolean> => {
    if (pendingManualSave) return pendingManualSave;
    if (pendingSceneSavePromise) return pendingSceneSavePromise;
    if (isEditorReady?.() === false) return Promise.resolve(false);
    const target = targetVersion;
    pendingManualSave = (async () => {
      try {
        await confirmManualSaveDialog();
      } catch {
        return false;
      }
      if (target !== targetVersion || isEditorReady?.() === false) return false;
      return requestSceneSave("manual");
    })().finally(() => {
      pendingManualSave = null;
    });
    return pendingManualSave;
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
    targetVersion += 1;
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
    requestManualSceneSave,
    isManualSavePending: () => pendingManualSave !== null,
    resolveUnsavedBeforeLeave,
    handleBeforeUnload,
    cleanupPendingResolver,
  };
}
