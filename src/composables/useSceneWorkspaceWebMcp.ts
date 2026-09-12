import {
  createSceneWorkspaceTools,
  type SceneWorkspaceContext,
} from "@/services/webmcp/scene-workspace-tools";
import {
  useEditorWorkspaceWebMcp,
  type EditorWorkspaceWebMcpOptions,
} from "./useEditorWorkspaceWebMcp";

export function useSceneWorkspaceWebMcp(
  options: EditorWorkspaceWebMcpOptions<SceneWorkspaceContext>
) {
  useEditorWorkspaceWebMcp(
    options,
    createSceneWorkspaceTools,
    "场景工作区已切换，请重新发现工具"
  );
}
