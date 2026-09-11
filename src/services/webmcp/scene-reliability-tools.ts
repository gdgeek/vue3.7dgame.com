import type { MetaInfo } from "@/api/v1/types/meta";
import type { RegisterSceneEditorWebMcpOptions } from "./scene-editor-tools";
import { buildEntityAssetUsage } from "./entity-asset-lifecycle-tools";
import type { WebMcpTool } from "./model-context";

const record = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      return record(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

export function inspectEntityReadiness(entity: MetaInfo) {
  const issues: string[] = [];
  const data = record(entity.data);
  if (!data || !Array.isArray(record(data.children)?.entities))
    issues.push("ENTITY_DATA_UNAVAILABLE");
  const componentConflicts: { path: string; types: string[] }[] = [];
  const pending = [{ node: data, path: "root" }];
  let visited = 0;
  while (pending.length && visited < 10000) {
    const current = pending.pop()!;
    visited += 1;
    const children = record(current.node?.children);
    const components = Array.isArray(children?.components)
      ? children.components
      : [];
    const types = components
      .map((item) => record(item)?.type)
      .filter(
        (type): type is string =>
          typeof type === "string" &&
          ["Action", "Moved", "Trigger"].includes(type)
      );
    if (types.length > 1)
      componentConflicts.push({ path: current.path, types });
    const nodes = Array.isArray(children?.entities) ? children.entities : [];
    nodes.forEach((node, index) =>
      pending.push({ node: record(node), path: `${current.path}/${index}` })
    );
  }
  if (componentConflicts.length) issues.push("INTERACTION_COMPONENT_CONFLICT");
  if (pending.length) issues.push("ENTITY_NODE_SCAN_LIMIT_EXCEEDED");
  const code = entity.metaCode;
  const script = {
    metadataAvailable: code !== undefined && code !== null,
    hasBlockly: Boolean(code?.blockly?.trim()),
    hasJavaScript: Boolean(code?.js?.trim()),
    hasLua: Boolean(code?.lua?.trim()),
    behaviorVerified: false,
  };
  const resourcesKnown = Array.isArray(entity.resources);
  if (!resourcesKnown) issues.push("RESOURCE_INVENTORY_UNAVAILABLE");
  const usage = buildEntityAssetUsage(entity);
  if (resourcesKnown && usage.missingResourceCount)
    issues.push("RESOURCE_REFERENCE_MISSING");
  if (usage.truncated) issues.push("RESOURCE_SCAN_TRUNCATED");
  const assets = (entity.resources ?? []).map((resource) => {
    const file = resource.file;
    const info = record(resource.info);
    const metadata = !file?.url ? "missing_file" : "present";
    const used = usage.assets.some(
      (item) =>
        String(item.resourceId) === String(resource.id) &&
        item.referenceCount > 0
    );
    if (used && metadata === "missing_file")
      issues.push("RESOURCE_FILE_MISSING");
    return {
      resourceId: resource.id,
      resourceType: resource.type,
      used,
      metadata,
      modelMetadata:
        resource.type === "polygen"
          ? info
            ? "present"
            : "unknown"
          : "not_applicable",
      initialization: "unknown",
      accessibility: "not_probed",
      runtimeCompatibility: "not_verified",
    };
  });
  return {
    entityId: entity.id,
    componentConflicts,
    script,
    issues: [...new Set(issues)],
    assets,
    missingResourceIds: resourcesKnown
      ? usage.missingResources.map((item) => item.resourceId)
      : [],
    metadataReady: issues.length === 0,
    runtimeReady: "unknown",
  };
}

export async function checkSceneReadiness(
  options: Pick<
    RegisterSceneEditorWebMcpOptions,
    "getContext" | "getLiveState" | "readEntityForReadiness"
  >
) {
  const before = options.getContext();
  const live = await options.getLiveState();
  const blockers: string[] = [];
  if (!before.scene || !before.ready || before.loading || live.loading)
    blockers.push("EDITOR_NOT_READY");
  if (before.dirty || live.changed) blockers.push("UNSAVED_CHANGES");
  if (!before.scene?.editable) blockers.push("SCENE_NOT_EDITABLE");
  if (!live.sceneVersion) blockers.push("SCENE_VERSION_UNAVAILABLE");
  const modules = record(record(live.verse)?.children)?.modules;
  const ids = new Set<number>();
  if (!Array.isArray(modules) || modules.length === 0)
    blockers.push("EMPTY_OR_INVALID_SCENE");
  for (const module of Array.isArray(modules) ? modules : []) {
    const raw = record(record(module)?.parameters)?.meta_id;
    const id = Number(raw);
    if (!Number.isSafeInteger(id) || id <= 0)
      blockers.push("ENTITY_REFERENCE_INVALID");
    else ids.add(id);
  }
  const entities: ReturnType<typeof inspectEntityReadiness>[] = [];
  const failures: { entityId: number; code: string }[] = [];
  // Bound API work; do not return a success for an incomplete inventory.
  if (ids.size > 100) blockers.push("ENTITY_SCAN_LIMIT_EXCEEDED");
  for (const entityId of [...ids].slice(0, 100)) {
    if (!options.readEntityForReadiness) {
      failures.push({ entityId, code: "ENTITY_READER_UNAVAILABLE" });
      continue;
    }
    try {
      const entity = await options.readEntityForReadiness(entityId);
      if (entity.id !== entityId) throw new Error("Entity mismatch");
      entities.push(inspectEntityReadiness(entity));
    } catch {
      // Never expose HTTP bodies, signed URLs or authentication headers.
      failures.push({ entityId, code: "ENTITY_READ_FAILED" });
    }
  }
  const after = options.getContext();
  const latest = await options.getLiveState();
  if (
    after.scene?.id !== before.scene?.id ||
    latest.sceneVersion !== live.sceneVersion ||
    latest.changed ||
    after.dirty ||
    latest.loading ||
    after.loading ||
    !after.ready ||
    !after.scene?.editable
  ) {
    blockers.push("SCENE_CHANGED_DURING_CHECK");
  }
  if (failures.length) blockers.push("ENTITY_READ_INCOMPLETE");
  if (entities.some((entity) => !entity.metadataReady))
    blockers.push("ENTITY_METADATA_NOT_READY");
  return {
    sceneId: before.scene?.id ?? null,
    sceneVersion: live.sceneVersion,
    checkedAt: new Date().toISOString(),
    blockers: [...new Set(blockers)],
    entities,
    failures,
    metadataReady: blockers.length === 0,
    runtimeReady: "unknown",
    limitations: [
      "No asset bytes fetched",
      "Initialization status is not exposed by the resource API",
      "Script behavior and target runtime require separate execution tests",
    ],
  };
}

export function createSceneReliabilityTools(
  options: RegisterSceneEditorWebMcpOptions
): WebMcpTool[] {
  const read = (
    name: string,
    description: string,
    execute: () => unknown
  ): WebMcpTool => ({
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input) {
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.keys(input).length
      )
        throw new TypeError("工具参数必须是空对象");
      return execute();
    },
  });
  return [
    read(
      "xrugc_check_scene_resource_readiness",
      "重新读取当前场景引用实体与资源元数据，检查缺失引用及文件信息；不下载、不初始化、不保存。unknown 不代表运行就绪。",
      () => checkSceneReadiness(options)
    ),
    read(
      "xrugc_check_scene_publication_readiness",
      "执行场景结构和资源发布前检查；返回阻塞项与未验证范围，不发布。",
      async () => {
        const report = await checkSceneReadiness(options);
        const structure = await options.validateForReadiness?.();
        return {
          ...report,
          structure: structure ?? null,
          publicationReady:
            report.metadataReady &&
            structure?.valid === true &&
            structure.moduleCount > 0,
        };
      }
    ),
    read(
      "xrugc_get_scene_runtime_diagnostics",
      "读取当前页面 Unity 预览诊断；区分加载、桥接就绪与运行，不代表线上插件或头显验收。",
      () => {
        const state = options.getPreviewStatus();
        return {
          sceneId: state.sceneId,
          phase: state.phase,
          running: state.phase === "running",
          failure: state.failure ?? null,
          nextAction:
            state.phase === "attention"
              ? "Inspect runtime and asset rejection logs; do not infer the cause from HTTP success"
              : state.phase === "closed"
                ? "Start preview to collect runtime evidence"
                : state.phase === "running"
                  ? "Verify interactions on the target device"
                  : "Wait for runtime acknowledgement",
          scope: "current_page_preview",
          onlineRuntimeVerified: false,
        };
      }
    ),
  ];
}
