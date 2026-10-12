import type { WebMcpTool } from "./model-context";

export type EditorWorkspaceToolOptions<T extends object> = {
  getContext: () => T;
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

export const createEditorWorkspaceTools = <T extends object>(
  kind: "scene" | "entity",
  label: "场景" | "实体",
  options: EditorWorkspaceToolOptions<T>
): WebMcpTool[] => [
  {
    name: `xrugc_get_${kind}_workspace_context`,
    title: `读取 XRUGC ${label}工作区上下文`,
    description: `读取当前${label}、活动编辑器、脚本抽屉及双方的就绪、修改和保存状态。加载期间对应 iframe 显示局部遮罩、依赖编辑内容的按钮分别 loading/禁用；页面导航与服务器发布历史仍可使用。ready=false 或 blocked=true 时须等待 retryAfterMs 后重读本工具，status=error 时需用户重试。不会打开、关闭、保存或放弃修改。可用编辑工具以实际工具发现结果为准；每次切换编辑器后都应重新发现工具。`,
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
    name: `xrugc_open_${kind}_script_editor`,
    title: `打开 XRUGC ${label}脚本编辑器`,
    description: `在当前${label}内打开脚本编辑抽屉，保留${label}和页面 URL，不会自动保存或放弃修改。opened 仅表示抽屉已打开，编辑器是否就绪请检查 context.script.ready；切换后请重新发现工具。`,
    inputSchema: emptyInputSchema,
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input, execution) {
      requireEmptyInput(input);
      execution?.signal.throwIfAborted();
      const context = options.getContext();
      const state = (context as Record<string, unknown>)[kind] as
        | { blocked?: boolean; status?: string; retryAfterMs?: number | null }
        | undefined;
      if (state?.blocked) {
        return {
          status: state.status ?? "loading",
          applied: false,
          retryAfterMs: state.retryAfterMs,
          context,
        };
      }
      await options.openScriptEditor();
      return {
        status: "opened",
        context: options.getContext(),
        rediscoverTools: true,
      };
    },
  },
  {
    name: `xrugc_close_${kind}_script_editor`,
    title: `关闭 XRUGC ${label}脚本编辑器`,
    description: `关闭脚本编辑抽屉并返回仍然打开的${label}。不会自动保存或放弃修改；关闭沿用页面的未保存修改确认，用户取消时保持抽屉打开。关闭成功后请重新发现工具。`,
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
