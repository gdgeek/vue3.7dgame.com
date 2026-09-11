import type { WebMcpTool } from "./model-context";

type JsonRecord = Record<string, unknown>;

export type SceneRuntimePreviewStatus = {
  sceneId: number | null;
  sceneName: string | null;
  visible: boolean;
  frameVisible: boolean;
  ready: boolean;
  phase: "closed" | "loading" | "ready" | "running" | "attention";
  status: string;
  failure?: { code: string; stage: string } | null;
};

export type SceneRuntimePreviewToolOptions = {
  getPreviewStatus: () => SceneRuntimePreviewStatus;
  startPreview: () => Promise<SceneRuntimePreviewStatus>;
  stopPreview: () => Promise<SceneRuntimePreviewStatus>;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createSceneRuntimePreviewTools = (
  options: SceneRuntimePreviewToolOptions
): WebMcpTool[] => [
  {
    name: "xrugc_get_scene_runtime_preview_status",
    title: "读取 XRUGC 场景运行预览状态",
    description:
      "读取当前页面可见 Unity 场景运行预览的打开、加载、就绪或运行状态。不会启动、停止、保存或发布场景。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input) {
      if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
      return options.getPreviewStatus();
    },
  },
  {
    name: "xrugc_start_scene_runtime_preview",
    title: "启动 XRUGC 场景运行预览",
    description:
      "确认场景已保存且可用后，打开页面内可见 Unity 运行预览并开始加载当前场景、实体、资源和脚本。不会保存或发布场景；用状态工具继续检查是否运行成功。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input) {
      if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
      return options.startPreview();
    },
  },
  {
    name: "xrugc_stop_scene_runtime_preview",
    title: "停止 XRUGC 场景运行预览",
    description:
      "关闭页面内可见 Unity 场景运行预览并清理当前预览 iframe 状态。不会修改、保存或发布场景。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    async execute(input) {
      if (!isRecord(input)) throw new TypeError("工具参数必须是对象");
      return options.stopPreview();
    },
  },
];
