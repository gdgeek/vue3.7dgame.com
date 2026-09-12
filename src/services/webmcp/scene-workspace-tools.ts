import type { WebMcpTool } from "./model-context";

export type SceneWorkspaceContext = {
  sceneId: number | null;
  sceneName: string | null;
  activeEditor: "scene" | "scene-script";
  scene: {
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

const emptyInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const requireEmptyInput = (input: unknown) => {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input)) ||
    Reflect.ownKeys(input).length !== 0
  ) {
    throw new TypeError("工具参数必须是空对象，不接受保存或放弃修改等参数");
  }
};

export const createSceneWorkspaceTools = (
  options: SceneWorkspaceToolOptions
): WebMcpTool[] => [
  {
    name: "xrugc_get_scene_workspace_context",
    title: "读取 XRUGC 场景工作区上下文",
    description:
      "读取当前场景、活动编辑器、脚本抽屉及双方的就绪、修改和保存状态。不会打开、关闭、保存或放弃修改。可用编辑工具以实际工具发现结果为准；每次切换编辑器后都应重新发现工具。",
    inputSchema: emptyInputSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input, execution) {
      requireEmptyInput(input);
      execution?.signal.throwIfAborted();
      return {
        ...options.getContext(),
        toolDiscoveryHint:
          "可用编辑工具以实际工具发现结果为准；每次切换编辑器后请重新发现工具。",
      };
    },
  },
  {
    name: "xrugc_open_scene_script_editor",
    title: "打开 XRUGC 场景脚本编辑器",
    description:
      "在当前场景内打开脚本编辑抽屉，保留场景和页面 URL，不会自动保存或放弃修改。opened 仅表示抽屉已打开，编辑器是否就绪请检查 context.script.ready；切换后请重新发现工具。",
    inputSchema: emptyInputSchema,
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input, execution) {
      requireEmptyInput(input);
      execution?.signal.throwIfAborted();
      await options.openScriptEditor();
      return {
        status: "opened",
        context: options.getContext(),
        rediscoverTools: true,
      };
    },
  },
  {
    name: "xrugc_close_scene_script_editor",
    title: "关闭 XRUGC 场景脚本编辑器",
    description:
      "关闭脚本编辑抽屉并返回仍然打开的场景。不会自动保存或放弃修改；关闭沿用页面的未保存修改确认，用户取消时保持抽屉打开。关闭成功后请重新发现工具。",
    inputSchema: emptyInputSchema,
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input, execution) {
      requireEmptyInput(input);
      execution?.signal.throwIfAborted();
      const closed = await options.closeScriptEditor();
      return {
        status: closed ? "closed" : "cancelled",
        context: options.getContext(),
        rediscoverTools: closed,
      };
    },
  },
];
