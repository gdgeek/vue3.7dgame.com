import {
  createEntityWorkspaceTools,
  type EntityWorkspaceContext,
} from "@/services/webmcp/entity-workspace-tools";
import {
  useEditorWorkspaceWebMcp,
  type EditorWorkspaceWebMcpOptions,
} from "./useEditorWorkspaceWebMcp";

export function useEntityWorkspaceWebMcp(
  options: EditorWorkspaceWebMcpOptions<EntityWorkspaceContext>
) {
  useEditorWorkspaceWebMcp(
    options,
    createEntityWorkspaceTools,
    "实体工作区已切换，请重新发现工具"
  );
}
