import { createSceneReliabilityTools } from "./scene-reliability-tools";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { VerseData } from "@/api/v1/verse";
import {
  registerWebMcpTools,
  type WebMcpRegistrationOptions,
  type WebMcpTool,
} from "./model-context";
import {
  createSceneEntityPlacementTools,
  type SceneEntityPlacementCompletion,
  type SceneEntityPlacementPreview,
  type SceneModuleTransform,
} from "./scene-entity-placement-tools";
import {
  createSceneModuleTransformTools,
  type SceneModuleTransformCompletion,
  type SceneModuleTransformPatch,
  type SceneModuleTransformPreview,
} from "./scene-module-transform-tools";
import {
  createSceneModulePropertyTools,
  type SceneModulePropertyCompletion,
  type SceneModulePropertyPatch,
  type SceneModulePropertyPreview,
} from "./scene-module-property-tools";
import {
  createSceneModuleDeletionTools,
  type SceneModuleDeletionCompletion,
  type SceneModuleDeletionPreview,
} from "./scene-module-deletion-tools";
import {
  createScenePublicationTools,
  type ScenePublicationCompletion,
  type ScenePublicationPreview,
} from "./scene-publication-tools";
import {
  createSceneRuntimePreviewTools,
  type SceneRuntimePreviewStatus,
} from "./scene-runtime-preview-tools";

type JsonRecord = Record<string, unknown>;

export type SceneEditorLiveState = {
  verse: unknown;
  sceneVersion: string;
  changed: boolean;
  loading: boolean;
  selectedModuleIds: string[];
};

type SceneEditorContext = {
  scene: VerseData | null;
  dirty: boolean;
  loading: boolean;
  ready: boolean;
};

export type SceneEntitySearchInput = {
  query: string;
  page: number;
  pageSize: number;
};

export type SceneEntitySearchResult = {
  items: MetaInfo[];
  page: number;
  pageSize: number;
  total?: number;
};

export type RegisterSceneEditorWebMcpOptions = WebMcpRegistrationOptions & {
  readEntityForReadiness?: (entityId: number) => Promise<MetaInfo>;
  validateForReadiness?: () => Promise<{
    valid: boolean;
    moduleCount: number;
    errors: string[];
    warnings: string[];
  }>;
  getContext: () => SceneEditorContext;
  getLiveState: () => Promise<SceneEditorLiveState>;
  searchEntities: (
    input: SceneEntitySearchInput
  ) => Promise<SceneEntitySearchResult>;
  stageEntityPlacement: (input: {
    entityId: number;
    title?: string;
    transform: SceneModuleTransform;
  }) => Promise<SceneEntityPlacementPreview>;
  confirmEntityPlacement: (
    preview: SceneEntityPlacementPreview
  ) => Promise<boolean>;
  completeEntityPlacement: (
    preview: SceneEntityPlacementPreview
  ) => Promise<SceneEntityPlacementCompletion>;
  stageModuleTransform: (
    moduleId: string,
    transform: SceneModuleTransformPatch
  ) => Promise<SceneModuleTransformPreview>;
  confirmModuleTransform: (
    preview: SceneModuleTransformPreview
  ) => Promise<boolean>;
  completeModuleTransform: (
    preview: SceneModuleTransformPreview
  ) => Promise<SceneModuleTransformCompletion>;
  stageModuleProperties: (
    moduleId: string,
    properties: SceneModulePropertyPatch
  ) => Promise<SceneModulePropertyPreview>;
  confirmModuleProperties: (
    preview: SceneModulePropertyPreview
  ) => Promise<boolean>;
  completeModuleProperties: (
    preview: SceneModulePropertyPreview
  ) => Promise<SceneModulePropertyCompletion>;
  stageModuleDeletion: (
    moduleId: string
  ) => Promise<SceneModuleDeletionPreview>;
  confirmModuleDeletion: (
    preview: SceneModuleDeletionPreview
  ) => Promise<boolean>;
  completeModuleDeletion: (
    preview: SceneModuleDeletionPreview
  ) => Promise<SceneModuleDeletionCompletion>;
  stageScenePublication: () => Promise<ScenePublicationPreview>;
  confirmScenePublication: (
    preview: ScenePublicationPreview
  ) => Promise<boolean>;
  completeScenePublication: (
    preview: ScenePublicationPreview
  ) => Promise<ScenePublicationCompletion>;
  getPreviewStatus: () => SceneRuntimePreviewStatus;
  startPreview: () => Promise<SceneRuntimePreviewStatus>;
  stopPreview: () => Promise<SceneRuntimePreviewStatus>;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): JsonRecord | null =>
  isRecord(value) ? value : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asFiniteNumber = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const clampInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
) => {
  const number = asFiniteNumber(value);
  if (number === null) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
};

const requireRecordInput = (input: unknown): JsonRecord => {
  if (!isRecord(input)) throw new TypeError("工具参数必须是一个对象");
  return input;
};

const getParameters = (module: JsonRecord): JsonRecord =>
  asRecord(module.parameters) ?? {};

const getModules = (verse: unknown): JsonRecord[] => {
  const data = asRecord(verse);
  const children = asRecord(data?.children);
  return Array.isArray(children?.modules)
    ? children.modules.filter(isRecord)
    : [];
};

const getModuleId = (module: JsonRecord, path: string) =>
  asString(getParameters(module).uuid) ??
  asString(module.uuid) ??
  asString(module.id) ??
  (asFiniteNumber(module.id) !== null ? String(module.id) : path);

const getModuleTitle = (module: JsonRecord) =>
  asString(getParameters(module).title) ??
  asString(module.name) ??
  "未命名实体实例";

const getMetaId = (module: JsonRecord): string | number | null => {
  const value = getParameters(module).meta_id;
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
};

const getModuleActive = (module: JsonRecord) => {
  const value = getParameters(module).active;
  return typeof value === "boolean" ? value : true;
};

const isSensitiveOutputKey = (key: string) =>
  /token|authorization|password|secret|cookie|signed.?url|file|url/i.test(key);

const compactValue = (
  value: unknown,
  depth = 0
): string | number | boolean | null | unknown[] | JsonRecord => {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  }
  if (depth >= 3) return "[已省略深层数据]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => compactValue(item, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveOutputKey(key))
        .slice(0, 30)
        .map(([key, item]) => [key, compactValue(item, depth + 1)])
    );
  }
  return String(value);
};

const getTransform = (module: JsonRecord) => {
  const transform = asRecord(getParameters(module).transform) ?? {};
  const vector = (key: "position" | "rotate" | "scale") => {
    const value = asRecord(transform[key]) ?? {};
    return {
      x: asFiniteNumber(value.x),
      y: asFiniteNumber(value.y),
      z: asFiniteNumber(value.z),
    };
  };
  return {
    position: vector("position"),
    rotate: vector("rotate"),
    scale: vector("scale"),
  };
};

const summarizeModule = (module: JsonRecord, path: string) => ({
  id: getModuleId(module, path),
  path,
  title: getModuleTitle(module),
  entityId: getMetaId(module),
  active: getModuleActive(module),
  transform: getTransform(module),
});

export const buildSceneModuleList = (
  verse: unknown,
  options: { query?: string; limit?: number } = {}
) => {
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const limit = clampInteger(options.limit, 200, 1, 500);
  const modules = getModules(verse);
  const matched = modules
    .map((module, index) => ({ module, path: String(index) }))
    .filter(({ module, path }) => {
      if (!query) return true;
      return [
        getModuleId(module, path),
        getModuleTitle(module),
        String(getMetaId(module) ?? ""),
      ].some((value) => value.toLocaleLowerCase().includes(query));
    });

  return {
    moduleCount: modules.length,
    matchedCount: matched.length,
    truncated: matched.length > limit,
    modules: matched
      .slice(0, limit)
      .map(({ module, path }) => summarizeModule(module, path)),
  };
};

export const inspectSceneModule = (
  verse: unknown,
  selector: { moduleId?: string; path?: string; title?: string }
) => {
  const modules = getModules(verse);
  const moduleId = selector.moduleId?.trim();
  const path = selector.path?.trim();
  const title = selector.title?.trim();
  const match = modules
    .map((module, index) => ({ module, path: String(index) }))
    .find(
      ({ module, path: modulePath }) =>
        (path && path === modulePath) ||
        (moduleId && moduleId === getModuleId(module, modulePath)) ||
        (title && title === getModuleTitle(module))
    );

  if (!match) return { found: false, selector };
  return {
    found: true,
    ...summarizeModule(match.module, match.path),
    parameters: compactValue(getParameters(match.module)),
  };
};

const validateVector = (
  modulePath: string,
  label: string,
  value: { x: number | null; y: number | null; z: number | null },
  errors: string[]
) => {
  for (const axis of ["x", "y", "z"] as const) {
    if (value[axis] === null) {
      errors.push(`实体实例 ${modulePath} 的${label}.${axis}不是有效数字`);
    }
  }
};

export const validateScene = (
  scene: VerseData | null,
  liveState: SceneEditorLiveState
) => {
  if (!scene) {
    return {
      valid: false,
      errors: ["场景数据尚未加载"],
      warnings: [],
      moduleCount: 0,
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const modules = getModules(liveState.verse);
  const knownMetaIds = new Set(
    (scene.metas ?? []).map((item) => String(item.id))
  );
  const ids = new Map<string, string[]>();
  const titles = new Map<string, string[]>();

  modules.forEach((module, index) => {
    const path = String(index);
    const parameters = getParameters(module);
    const explicitId = asString(parameters.uuid) ?? asString(module.uuid);
    const title = getModuleTitle(module);
    const metaId = getMetaId(module);

    if (!explicitId) {
      errors.push(`实体实例 ${path} 缺少 UUID`);
    } else {
      const paths = ids.get(explicitId) ?? [];
      paths.push(path);
      ids.set(explicitId, paths);
    }
    if (title === "未命名实体实例") {
      warnings.push(`实体实例 ${path} 没有名称`);
    }
    const titlePaths = titles.get(title) ?? [];
    titlePaths.push(path);
    titles.set(title, titlePaths);

    if (metaId === null) {
      errors.push(`实体实例 ${path} 缺少实体引用 meta_id`);
    } else if (!knownMetaIds.has(String(metaId))) {
      errors.push(`实体实例 ${path} 引用了不存在的实体 ${metaId}`);
    }

    const transform = getTransform(module);
    validateVector(path, "位置", transform.position, errors);
    validateVector(path, "旋转", transform.rotate, errors);
    validateVector(path, "缩放", transform.scale, errors);
    if (
      transform.scale.x === 0 ||
      transform.scale.y === 0 ||
      transform.scale.z === 0
    ) {
      warnings.push(`实体实例 ${path} 的至少一个缩放轴为 0，运行时可能不可见`);
    }
  });

  for (const [uuid, paths] of ids) {
    if (paths.length > 1) {
      errors.push(`UUID“${uuid}”重复，位置：${paths.join("、")}`);
    }
  }
  for (const [title, paths] of titles) {
    if (paths.length > 1) {
      warnings.push(`名称“${title}”重复，位置：${paths.join("、")}`);
    }
  }
  if (modules.length === 0) warnings.push("场景中还没有实体实例");
  if (liveState.loading) warnings.push("场景编辑器仍在加载实体资源");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    moduleCount: modules.length,
    referencedEntityCount: new Set(
      modules
        .map(getMetaId)
        .filter((value): value is string | number => value !== null)
        .map(String)
    ).size,
    dirty: liveState.changed,
  };
};

const summarizeEntity = (entity: MetaInfo) => ({
  id: entity.id,
  uuid: entity.uuid,
  title: entity.title || entity.name || "未命名实体",
  resourceCount: entity.resources?.length ?? 0,
  inputSignalCount: entity.events?.inputs?.length ?? 0,
  outputSignalCount: entity.events?.outputs?.length ?? 0,
  hasPreview: Boolean(entity.image),
  editable: entity.editable,
  viewable: entity.viewable,
  updatedAt: entity.updated_at,
});

const createTools = (
  options: RegisterSceneEditorWebMcpOptions
): WebMcpTool[] => [
  {
    name: "xrugc_get_scene_editor_context",
    title: "读取 XRUGC 场景编辑器状态",
    description:
      "读取当前场景标识、名称、权限、发布状态、空间、实时未保存状态、实体实例数量和当前选择。不会保存、发布或修改场景。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      requireRecordInput(input);
      const context = options.getContext();
      const liveState = await options.getLiveState();
      const scene = context.scene;
      return {
        editor: "scene",
        ready: context.ready,
        loading: context.loading || liveState.loading,
        dirty: context.dirty || liveState.changed,
        scene: scene
          ? {
              id: scene.id,
              uuid: scene.uuid,
              name: scene.name,
              editable: scene.editable,
              viewable: scene.viewable,
              published:
                scene.verseRelease === undefined
                  ? null
                  : Boolean(scene.verseRelease),
              moduleCount: getModules(liveState.verse).length,
              space: scene.space
                ? { id: scene.space.id, name: scene.space.name }
                : null,
            }
          : null,
        selectedModuleIds: liveState.selectedModuleIds,
      };
    },
  },
  {
    name: "xrugc_get_scene_modules",
    title: "读取 XRUGC 场景实体实例",
    description:
      "从当前可见场景编辑器读取实体实例列表，包括实例 UUID、名称、实体 ID、可见性和变换。可按名称、UUID 或实体 ID 搜索；不会修改场景。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 100, default: "" },
        limit: { type: "integer", minimum: 1, maximum: 500, default: 200 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      const params = requireRecordInput(input);
      const liveState = await options.getLiveState();
      return buildSceneModuleList(liveState.verse, {
        query: asString(params.query) ?? "",
        limit: clampInteger(params.limit, 200, 1, 500),
      });
    },
  },
  {
    name: "xrugc_inspect_scene_module",
    title: "检查 XRUGC 场景实体实例",
    description:
      "按 moduleId、列表 path（例如 0）或精确名称，从当前可见编辑器读取一个场景实体实例的参数摘要。至少提供一个选择条件，不会修改场景。",
    inputSchema: {
      type: "object",
      properties: {
        moduleId: { type: "string", minLength: 1 },
        path: { type: "string", pattern: "^\\d+$" },
        title: { type: "string", minLength: 1 },
      },
      anyOf: [
        { required: ["moduleId"] },
        { required: ["path"] },
        { required: ["title"] },
      ],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      const params = requireRecordInput(input);
      const selector = {
        moduleId: asString(params.moduleId) ?? undefined,
        path: asString(params.path) ?? undefined,
        title: asString(params.title) ?? undefined,
      };
      if (!selector.moduleId && !selector.path && !selector.title) {
        throw new TypeError("moduleId、path、title 至少需要提供一个");
      }
      const liveState = await options.getLiveState();
      return inspectSceneModule(liveState.verse, selector);
    },
  },
  {
    name: "xrugc_validate_scene",
    title: "检查 XRUGC 场景可用性",
    description:
      "检查当前可见场景中的空场景、无效实体引用、缺失或重复 UUID、重复名称及异常变换，返回错误与警告。不会保存、发布或修改场景。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      requireRecordInput(input);
      const liveState = await options.getLiveState();
      return validateScene(options.getContext().scene, liveState);
    },
  },
  {
    name: "xrugc_search_entities",
    title: "搜索可放入场景的 XRUGC 实体",
    description:
      "通过平台现有实体接口搜索可放入当前场景的实体，返回名称、信号数和素材数等摘要。不会打开对话框、放入实体或修改场景。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 100, default: "" },
        page: { type: "integer", minimum: 1, default: 1 },
        pageSize: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    async execute(input) {
      const params = requireRecordInput(input);
      const page = clampInteger(params.page, 1, 1, 100000);
      const pageSize = clampInteger(params.pageSize, 20, 1, 50);
      const result = await options.searchEntities({
        query: asString(params.query) ?? "",
        page,
        pageSize,
      });
      return {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        items: result.items.map(summarizeEntity),
      };
    },
  },
];

export const registerSceneEditorWebMcpTools = (
  options: RegisterSceneEditorWebMcpOptions
) =>
  registerWebMcpTools(
    [
      ...createTools(options),
      ...createSceneReliabilityTools(options),
      ...createSceneEntityPlacementTools({
        getSceneId: () => options.getContext().scene?.id ?? null,
        stageEntityPlacement: options.stageEntityPlacement,
        confirmEntityPlacement: options.confirmEntityPlacement,
        completeEntityPlacement: options.completeEntityPlacement,
      }),
      ...createSceneModuleTransformTools({
        getSceneId: () => options.getContext().scene?.id ?? null,
        stageModuleTransform: options.stageModuleTransform,
        confirmModuleTransform: options.confirmModuleTransform,
        completeModuleTransform: options.completeModuleTransform,
      }),
      ...createSceneModulePropertyTools({
        getSceneId: () => options.getContext().scene?.id ?? null,
        stageModuleProperties: options.stageModuleProperties,
        confirmModuleProperties: options.confirmModuleProperties,
        completeModuleProperties: options.completeModuleProperties,
      }),
      ...createSceneModuleDeletionTools({
        getSceneId: () => options.getContext().scene?.id ?? null,
        stageModuleDeletion: options.stageModuleDeletion,
        confirmModuleDeletion: options.confirmModuleDeletion,
        completeModuleDeletion: options.completeModuleDeletion,
      }),
      ...createScenePublicationTools({
        getSceneId: () => options.getContext().scene?.id ?? null,
        stageScenePublication: options.stageScenePublication,
        confirmScenePublication: options.confirmScenePublication,
        completeScenePublication: options.completeScenePublication,
      }),
      ...createSceneRuntimePreviewTools({
        getPreviewStatus: options.getPreviewStatus,
        startPreview: options.startPreview,
        stopPreview: options.stopPreview,
      }),
    ],
    {
      document: options.document,
      onRegistrationError: options.onRegistrationError,
    }
  );
