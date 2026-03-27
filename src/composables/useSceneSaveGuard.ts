import { ref, type Ref } from "vue";
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
  onBeforeSave?: (trigger: ScriptSaveTrigger) => void;
}

export function useSceneSaveGuard(options: UseSceneSaveGuardOptions) {
  const {
    sendRequest,
    pendingRequests,
    pendingRestorePayload,
    isSavingVersion,
    confirmDialog,
    onBeforeSave,
  } = options;

  let pendingLeaveSaveResolver: ((result: boolean) => void) | null = null;
  const hasUnsavedChangesBeforeUnload = ref(false);
  let isPollingUnsavedChanges = false;
  let pendingSceneSavePromise: Promise<boolean> | null = null;

  const queryUnsavedChangesBeforeLeave = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const requestId = sendRequest("check-unsaved-changes");
      if (!requestId) {
        resolve(false);
        return;
      }

      const timeout = window.setTimeout(() => {
        pendingRequests.delete(requestId);
        resolve(false);
      }, 1200);

      pendingRequests.set(requestId, (payload) => {
        window.clearTimeout(timeout);
        pendingRequests.delete(requestId);
        resolve(pendingRestorePayload.value ? true : Boolean(payload.changed));
      });
    });
  };

  const syncUnsavedChangesForBeforeUnload = async () => {
    if (isPollingUnsavedChanges) return;

    isPollingUnsavedChanges = true;
    try {
      const changed = await queryUnsavedChangesBeforeLeave();
      hasUnsavedChangesBeforeUnload.value = pendingRestorePayload.value
        ? true
        : changed;
    } finally {
      isPollingUnsavedChanges = false;
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
    if (pendingRestorePayload.value) {
      hasUnsavedChangesBeforeUnload.value = true;
    }
    const changed = await queryUnsavedChangesBeforeLeave();
    hasUnsavedChangesBeforeUnload.value = pendingRestorePayload.value
      ? true
      : changed;

    if (!changed) {
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
