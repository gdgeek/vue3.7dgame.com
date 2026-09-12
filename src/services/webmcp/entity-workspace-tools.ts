import { createEditorWorkspaceTools } from "./editor-workspace-tools";

export type EntityWorkspaceContext = {
  entityId: number | null;
  entityTitle: string | null;
  activeEditor: "entity" | "entity-script";
  entity: {
    ready: boolean;
    dirty: boolean;
    saving: boolean;
  };
  script: {
    open: boolean;
    ready: boolean;
    dirty: boolean;
    saving: boolean;
    tab: "blockly" | "script" | null;
  };
};

export type EntityWorkspaceToolOptions = {
  getContext: () => EntityWorkspaceContext;
  openScriptEditor: () => Promise<void>;
  closeScriptEditor: () => Promise<boolean>;
};

export const createEntityWorkspaceTools = (
  options: EntityWorkspaceToolOptions
) => createEditorWorkspaceTools("entity", "实体", options);
