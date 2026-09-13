import { reactive, readonly } from "vue";

export type EditorToolbarStatus = "saving" | "saved" | "autosaved" | "dirty";

type EditorVersionToolbarState = {
  active: boolean;
  owner: string | null;
  status: EditorToolbarStatus;
  onRunPreview: (() => void) | null;
  onOpen: (() => void) | null;
  onOpenScript: (() => void) | null;
  onOpenPublications: (() => void) | null;
};

const state = reactive<EditorVersionToolbarState>({
  active: false,
  owner: null,
  status: "saved",
  onRunPreview: null,
  onOpen: null,
  onOpenScript: null,
  onOpenPublications: null,
});

const resetState = () => {
  state.active = false;
  state.owner = null;
  state.status = "saved";
  state.onRunPreview = null;
  state.onOpen = null;
  state.onOpenScript = null;
  state.onOpenPublications = null;
};

export const useEditorVersionToolbar = () => {
  const registerToolbar = (
    owner: string,
    payload: Partial<EditorVersionToolbarState>
  ) => {
    state.active = true;
    state.owner = owner;
    state.status = payload.status || "saved";
    state.onRunPreview = payload.onRunPreview || null;
    state.onOpen = payload.onOpen || null;
    state.onOpenScript = payload.onOpenScript || null;
    state.onOpenPublications = payload.onOpenPublications || null;
  };

  const updateToolbarStatus = (owner: string, status: EditorToolbarStatus) => {
    if (state.owner !== owner) return;
    state.status = status;
  };

  const unregisterToolbar = (owner: string) => {
    if (state.owner !== owner) return;
    resetState();
  };

  const openDialog = () => {
    state.onOpen?.();
  };

  const runPreview = () => {
    state.onRunPreview?.();
  };

  const openScript = () => {
    state.onOpenScript?.();
  };

  return {
    editorVersionToolbarState: readonly(state),
    registerToolbar,
    updateToolbarStatus,
    unregisterToolbar,
    openDialog,
    runPreview,
    openScript,
    openPublications: () => state.onOpenPublications?.(),
  };
};
