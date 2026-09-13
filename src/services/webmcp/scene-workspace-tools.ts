import { createEditorWorkspaceTools } from "./editor-workspace-tools";

export type SceneWorkspaceContext = {
  sceneId: number | null;
  sceneName: string | null;
  activeEditor: "scene" | "scene-script";
  scene: {
    loading?: boolean;
    status?: "loading" | "ready" | "error";
    blocked?: boolean;
    error?: string | null;
    retryAfterMs?: number | null;
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

export type SceneWorkspaceToolOptions = {
  getContext: () => SceneWorkspaceContext;
  openScriptEditor: () => Promise<void>;
  closeScriptEditor: () => Promise<boolean>;
};

export const createSceneWorkspaceTools = (options: SceneWorkspaceToolOptions) =>
  createEditorWorkspaceTools("scene", "场景", options);
