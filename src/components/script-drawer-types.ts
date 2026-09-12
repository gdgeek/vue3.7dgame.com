export type ScriptDrawerState = {
  open: boolean;
  ready: boolean;
  dirty: boolean;
  saving: boolean;
  tab: "blockly" | "script" | null;
};

export type ScriptDrawerHandle = {
  open: () => void;
  close: (assertActive?: () => void) => Promise<boolean>;
  getState: () => ScriptDrawerState;
  resolveBeforeLeave: () => Promise<boolean>;
  closeAfterNavigation: () => Promise<boolean>;
};

export type ScriptDrawerEditor = {
  resolveBeforeClose: () => Promise<boolean>;
  save: () => Promise<unknown>;
  openVersionDialog: () => void;
  saveable: boolean;
  isSaving: boolean;
  editorContentLoading: boolean;
  hasUnsavedChanges: boolean;
  activeName: "blockly" | "script";
};
