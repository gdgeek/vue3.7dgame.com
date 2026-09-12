import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  watch,
} from "vue";
import { registerWebMcpTools } from "@/services/webmcp/model-context";
import type { EditorWorkspaceToolOptions } from "@/services/webmcp/editor-workspace-tools";
import type { WebMcpTool } from "@/services/webmcp/model-context";

export type EditorWorkspaceWebMcpOptions<T extends object> = {
  ownerId: () => number;
  getContext: () => T;
  openScriptEditor: (assertActive: () => void) => Promise<void>;
  closeScriptEditor: (assertActive: () => void) => Promise<boolean>;
  onRegistrationError?: (toolName: string, error: unknown) => void;
};

/** Navigation tools belong to the host route, not to either editor's tool set. */
export function useEditorWorkspaceWebMcp<T extends object>(
  options: EditorWorkspaceWebMcpOptions<T>,
  createTools: (options: EditorWorkspaceToolOptions<T>) => WebMcpTool[],
  staleWorkspaceMessage: string
) {
  let active = false;
  let generation = 0;
  let lifecycle: AbortController | null = null;
  const stop = () => {
    generation += 1;
    lifecycle?.abort();
    lifecycle = null;
  };
  const register = () => {
    stop();
    if (!active) return;
    const ownerId = options.ownerId();
    const ownerGeneration = generation;
    const assertActive = () => {
      if (
        !active ||
        generation !== ownerGeneration ||
        options.ownerId() !== ownerId
      )
        throw new Error(staleWorkspaceMessage);
    };
    lifecycle = registerWebMcpTools(
      createTools({
        getContext: () => {
          assertActive();
          return options.getContext();
        },
        openScriptEditor: async () => {
          assertActive();
          await options.openScriptEditor(assertActive);
        },
        closeScriptEditor: async () => {
          assertActive();
          return options.closeScriptEditor(assertActive);
        },
      }),
      { onRegistrationError: options.onRegistrationError }
    );
  };
  const activate = () => {
    if (active) return;
    active = true;
    register();
  };
  const deactivate = () => {
    active = false;
    stop();
  };
  onMounted(activate);
  onActivated(activate);
  onDeactivated(deactivate);
  onBeforeUnmount(deactivate);
  watch(options.ownerId, register, { flush: "sync" });
}
