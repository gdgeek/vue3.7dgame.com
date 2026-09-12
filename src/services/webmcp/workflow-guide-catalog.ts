export const WORKFLOW_GUIDE_VERSION = "1.0.2";
export const WORKFLOW_GUIDE_ID = "xrugc-scene-studio";
export const WORKFLOW_GUIDE_TOOL_NAME = "xrugc_get_workflow_guide";

export const WORKFLOW_GUIDE_TOPICS = [
  {
    id: "overview",
    title: "场景制作总览",
    description: "需求、场景与脚本抽屉切换和完整制作流程",
  },
  {
    id: "assets",
    title: "模型与素材",
    description: "模型动画、资源上传和外部制作工具",
  },
  {
    id: "layout",
    title: "场景布局",
    description: "节点与实例、尺寸、方向及按钮高度",
  },
  {
    id: "interaction",
    title: "按钮与动画交互",
    description: "组件、动作、Blockly 与脚本验证",
  },
  {
    id: "audio",
    title: "讲解与音效",
    description: "旁白制作、播放顺序和停止重启",
  },
  {
    id: "publication",
    title: "保存与发布",
    description: "依赖保存、发布回执和独立重读",
  },
  {
    id: "acceptance",
    title: "运行验收",
    description: "资源、网页预览、Unity 与头显分别验收",
  },
  {
    id: "troubleshooting",
    title: "故障排查",
    description: "过期、部分完成、资源拒绝和运行问题",
  },
] as const;

export type WorkflowGuideTopic = (typeof WORKFLOW_GUIDE_TOPICS)[number]["id"];
export type WorkflowGuidePage =
  | "entity"
  | "scene"
  | "entity-script"
  | "scene-script";

export const workflowGuidePath = (topic: string) =>
  `webmcp/scene-studio/${WORKFLOW_GUIDE_VERSION}/${topic}.md`;

export const WORKFLOW_GUIDE_INDEX_PATH = `webmcp/scene-studio/${WORKFLOW_GUIDE_VERSION}/index.json`;
