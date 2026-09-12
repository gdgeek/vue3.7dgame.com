import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  watch,
} from "vue";
import { registerWebMcpTools } from "@/services/webmcp/model-context";
import {
  createSceneWorkspaceTools,
  type SceneWorkspaceContext,
} from "@/services/webmcp/scene-workspace-tools";

/** Navigation tools belong to the scene route, not to either editor's tool set. */
export function useSceneWorkspaceWebMcp(options: {
  ownerId: () => number;
  getContext: () => SceneWorkspaceContext;
  openScriptEditor: (assertActive: () => void) => Promise<void>;
  closeScriptEditor: (assertActive: () => void) => Promise<boolean>;
  onRegistrationError?: (toolName: string, error: unknown) => void;
}) {
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
        throw new Error("场景工作区已切换，请重新发现工具");
    };
    lifecycle = registerWebMcpTools(
      createSceneWorkspaceTools({
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
