import type { WebMcpTool } from "./model-context";
import {
  WORKFLOW_GUIDE_ID,
  WORKFLOW_GUIDE_INDEX_PATH,
  WORKFLOW_GUIDE_TOOL_NAME,
  WORKFLOW_GUIDE_TOPICS,
  WORKFLOW_GUIDE_VERSION,
  workflowGuidePath,
  type WorkflowGuidePage,
  type WorkflowGuideTopic,
} from "./workflow-guide-catalog";

const guideLoaders = {
  overview: () => import("./guides/overview.md?raw"),
  assets: () => import("./guides/assets.md?raw"),
  layout: () => import("./guides/layout.md?raw"),
  interaction: () => import("./guides/interaction.md?raw"),
  audio: () => import("./guides/audio.md?raw"),
  publication: () => import("./guides/publication.md?raw"),
  acceptance: () => import("./guides/acceptance.md?raw"),
  troubleshooting: () => import("./guides/troubleshooting.md?raw"),
} satisfies Record<WorkflowGuideTopic, () => Promise<{ default: string }>>;

const contextTools: Record<WorkflowGuidePage, string> = {
  entity: "xrugc_get_editor_context",
  scene: "xrugc_get_scene_editor_context",
  "entity-script": "xrugc_get_meta_script",
  "scene-script": "xrugc_get_scene_script",
};

const siteUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const getWorkflowGuideEntry = (page: WorkflowGuidePage) => ({
  tool: WORKFLOW_GUIDE_TOOL_NAME,
  guideId: WORKFLOW_GUIDE_ID,
  version: WORKFLOW_GUIDE_VERSION,
  page,
  input: { topic: "overview" },
  indexUrl: siteUrl(WORKFLOW_GUIDE_INDEX_PATH),
  documentationUrl: siteUrl(workflowGuidePath("overview")),
});

/** Add exactly once to the primary tool set, never to secondary iframe tools. */
export const withWorkflowGuide = (
  tools: WebMcpTool[],
  page: WorkflowGuidePage
): WebMcpTool[] => {
  const primaryTools = tools.map(({ name }) => name);
  return [
    ...tools,
    {
      name: WORKFLOW_GUIDE_TOOL_NAME,
      title: "读取 XRUGC 场景制作指南",
      description:
        "制作或修改 XRUGC 场景时，按主题读取本站维护的操作流程、前置条件和验收方法。首次可读取 overview，再按需读取布局、交互、音频、保存发布或排障指南；无需在客户端安装场景制作 Skill。只返回参考资料，不编辑、上传、安装软件或发布场景。",
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: WORKFLOW_GUIDE_TOPICS.map(({ id }) => id),
            default: "overview",
            description: "省略时读取总览；其他主题按当前任务需要读取。",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input, execution) {
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          throw new TypeError("指南参数必须是对象");
        }
        const params = input as Record<string, unknown>;
        if (Object.keys(params).some((key) => key !== "topic")) {
          throw new TypeError("指南仅接受 topic 参数");
        }
        const topic = params.topic === undefined ? "overview" : params.topic;
        const entry = WORKFLOW_GUIDE_TOPICS.find(({ id }) => id === topic);
        if (!entry) throw new TypeError("不支持的指南主题");
        execution?.signal.throwIfAborted();
        const { default: content } = await guideLoaders[entry.id]();
        execution?.signal.throwIfAborted();
        return {
          ...getWorkflowGuideEntry(page),
          topic: entry.id,
          title: entry.title,
          language: "zh-CN",
          documentationUrl: siteUrl(workflowGuidePath(entry.id)),
          topics: WORKFLOW_GUIDE_TOPICS.map((item) => ({ ...item })),
          contextTool: contextTools[page],
          primaryPageTools: [...primaryTools],
          toolAvailability:
            "primaryPageTools 只列出当前编辑上下文的主工具集定义，不包含另行注册的辅助工具，也不证明注册、登录或编辑器已就绪。场景工作区常驻的 xrugc_get_scene_workspace_context、xrugc_open_scene_script_editor、xrugc_close_scene_script_editor 和实体工作区常驻的 xrugc_get_entity_workspace_context、xrugc_open_entity_script_editor、xrugc_close_entity_script_editor 须独立发现；这些工具只在对应宿主编辑页提供，不适用于独立脚本路由。使用前读取上下文并以浏览器实际发现的工具及 schema 为准。切换页面或打开、关闭脚本抽屉后，即使 URL 不变也需重新发现；抽屉内场景主工具暂停；实体抽屉内实体主工具也暂停，关闭后脚本工具注销。",
          content,
          guidanceScope:
            "本站工作流参考资料，不授予上传、覆盖或发布权限。按用户当前任务和既有权限执行；Blender、Qwen 配音与头显验收需要相应外部环境。",
        };
      },
    },
  ];
};
