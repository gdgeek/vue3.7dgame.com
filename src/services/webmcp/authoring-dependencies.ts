import { ResourceDiagnosticError } from "./resource-diagnostic";
import type { WebMcpTool } from "./model-context";
import type { ObjectKind } from "./authoring-tools";

export type DependencyObject = {
  id: number;
  kind: ObjectKind;
  name: string;
  uuid: string;
  serverRevision?: string;
  data: unknown;
  resources?: Array<{ id: number; type: string }>;
  relatedSceneIds?: number[];
};
export type DependencyReader = {
  actor: () => string | null;
  context: () => string;
  read: (kind: ObjectKind, id: number) => Promise<DependencyObject>;
  asset: (
    type: string,
    id: number
  ) => Promise<{
    id: number;
    type: string;
    name: string;
    fileId: number | null;
  }>;
};
type Ref = { id: number; path: string; nodeId: string | null };
const object = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
const id = (v: unknown) => {
  if (
    typeof v !== "number" &&
    (typeof v !== "string" || !/^[1-9][0-9]*$/.test(v))
  )
    return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
/** Traverse only editor-owned scene/modules or entity/children shapes, with work limits. */
export function collectAuthoringReferences(
  data: unknown,
  kind: ObjectKind,
  limit = 1000
) {
  if (data === null)
    return { references: [] as Ref[], invalid: 0, truncated: false };
  let root = data;
  let invalid = 0;
  let truncated = false;
  if (typeof root === "string") {
    if (root.length > 2 * 1024 * 1024)
      return { references: [] as Ref[], invalid: 1, truncated: true };
    try {
      root = JSON.parse(root);
    } catch {
      return { references: [] as Ref[], invalid: 1, truncated: false };
    }
  }
  const children = object(object(root)?.children);
  const key = kind === "scene" ? "modules" : "entities";
  const raw = children?.[key];
  if (!Array.isArray(raw))
    return { references: [] as Ref[], invalid: 1, truncated: false };
  const stack = raw
    .slice(0, limit)
    .map((node, index) => ({ node, path: `${key}/${index}`, depth: 0 }));
  if (raw.length > limit) truncated = true;
  const references: Ref[] = [];
  const seen = new WeakSet<object>();
  let count = 0;
  while (stack.length && count++ < limit) {
    const { node, path, depth } = stack.pop()!;
    const value = object(node);
    if (!value || seen.has(value)) {
      invalid++;
      continue;
    }
    seen.add(value);
    const params = object(value.parameters);
    const rawId = params?.[kind === "scene" ? "meta_id" : "resource"];
    if (rawId !== undefined && rawId !== null && rawId !== "") {
      const parsed = id(rawId);
      if (parsed === null) invalid++;
      else
        references.push({
          id: parsed,
          path,
          nodeId:
            typeof (params?.uuid ?? value.uuid) === "string"
              ? String(params?.uuid ?? value.uuid).slice(0, 128)
              : null,
        });
    } else if (kind === "scene") invalid++;
    const nested = object(value.children)?.[key];
    if (Array.isArray(nested)) {
      if (depth >= 30) {
        truncated = true;
        continue;
      }
      const remaining = Math.max(0, limit - count - stack.length);
      if (nested.length > remaining) truncated = true;
      nested
        .slice(0, remaining)
        .forEach((child, i) =>
          stack.push({ node: child, path: `${path}/${i}`, depth: depth + 1 })
        );
    }
  }
  if (stack.length) truncated = true;
  return { references, invalid, truncated };
}
const summary = (o: DependencyObject) => ({
  id: o.id,
  kind: o.kind,
  name: o.name.slice(0, 200),
  uuid: o.uuid,
  serverRevision: o.serverRevision ?? null,
});
export function createAuthoringDependencyTools(
  d: DependencyReader
): WebMcpTool[] {
  const guard = () => {
    const actor = d.actor();
    const context = d.context();
    if (!actor) throw new Error("请先登录");
    return () => {
      if (d.actor() !== actor || d.context() !== context)
        throw new Error("账号或页面已改变，请重新分析");
    };
  };
  const input = (v: unknown) => {
    const value = object(v);
    const targetId = id(value?.id);
    if (!value || !targetId) throw new Error("需要有效对象 ID");
    const max = value.limit === undefined ? 20 : id(value.limit);
    if (!max || max > 50) throw new Error("limit 应为 1–50");
    return { value, targetId, max };
  };
  const props = {
    id: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
  };
  return [
    {
      name: "xrugc_inspect_authoring_dependencies",
      description:
        "读取已保存对象的场景→实体→素材依赖及引用位置。有限扫描，缺少关联和无权/不可用分开报告，不代表全站或运行状态。",
      inputSchema: {
        type: "object",
        properties: {
          ...props,
          kind: { type: "string", enum: ["scene", "entity"] },
        },
        required: ["kind", "id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const check = guard();
        const { value, targetId, max } = input(raw);
        if (value.kind !== "scene" && value.kind !== "entity")
          throw new Error("kind 无效");
        const root = await d.read(value.kind, targetId);
        check();
        const graph: Array<Record<string, unknown>> = [];
        const issues: Array<Record<string, unknown>> = [];
        let truncated = false;
        let reads = 1;
        let unknown = false;
        const entities: DependencyObject[] = [];
        if (root.kind === "scene") {
          const scan = collectAuthoringReferences(root.data, "scene");
          truncated ||= scan.truncated;
          if (scan.invalid)
            issues.push({
              code: "INVALID_ENTITY_REFERENCE",
              count: scan.invalid,
            });
          const refs = new Map<number, Ref[]>();
          for (const ref of scan.references)
            refs.set(ref.id, [...(refs.get(ref.id) ?? []), ref]);
          if (refs.size > max) truncated = true;
          for (const [entityId, positions] of [...refs].slice(0, max)) {
            check();
            try {
              const entity = await d.read("entity", entityId);
              reads++;
              check();
              entities.push(entity);
              graph.push({
                from: `scene:${root.id}`,
                to: `entity:${entityId}`,
                object: summary(entity),
                referenceCount: positions.length,
                references: positions.slice(0, 20),
              });
              if (positions.length > 20) truncated = true;
            } catch {
              check();
              unknown = true;
              issues.push({ code: "ENTITY_UNAVAILABLE", entityId });
            }
          }
        } else entities.push(root);
        const resourceErrors = new Map<
          string,
          ReturnType<ResourceDiagnosticError["result"]>
        >();
        const resourceCache = new Map<
          string,
          {
            id: number;
            type: string;
            name: string;
            fileId: number | null;
          } | null
        >();
        for (const entity of entities) {
          const scan = collectAuthoringReferences(entity.data, "entity");
          truncated ||= scan.truncated;
          if (scan.invalid)
            issues.push({
              code: "INVALID_RESOURCE_REFERENCE",
              entityId: entity.id,
              count: scan.invalid,
            });
          const declared = new Map(
            (entity.resources ?? []).slice(0, 500).map((r) => [r.id, r])
          );
          if ((entity.resources?.length ?? 0) > 500) truncated = true;
          const refs = new Map<number, Ref[]>();
          for (const ref of scan.references)
            refs.set(ref.id, [...(refs.get(ref.id) ?? []), ref]);
          if (refs.size > max) truncated = true;
          for (const [resourceId, positions] of [...refs].slice(0, max)) {
            const resource = declared.get(resourceId);
            if (!resource) {
              issues.push({
                code: "RESOURCE_NOT_ASSOCIATED",
                entityId: entity.id,
                resourceId,
              });
              continue;
            }
            const key = `${resource.type}:${resource.id}`;
            if (!resourceCache.has(key)) {
              if (resourceCache.size >= max) {
                truncated = true;
                continue;
              }
              check();
              try {
                const detail = await d.asset(resource.type, resource.id);
                reads++;
                check();
                resourceCache.set(key, detail);
              } catch (cause) {
                check();
                if (cause instanceof ResourceDiagnosticError)
                  resourceErrors.set(key, cause.result());
                resourceCache.set(key, null);
              }
            }
            const detail = resourceCache.get(key);
            if (!detail) {
              unknown = true;
              issues.push({
                code: "RESOURCE_UNAVAILABLE",
                ...(resourceErrors.has(key)
                  ? { diagnostic: resourceErrors.get(key) }
                  : {}),
                entityId: entity.id,
                resourceId,
              });
              continue;
            }
            graph.push({
              from: `entity:${entity.id}`,
              to: `resource:${resourceId}`,
              resource: detail,
              referenceCount: positions.length,
              references: positions.slice(0, 20),
            });
            if (positions.length > 20) truncated = true;
            if (!detail.fileId)
              issues.push({ code: "RESOURCE_FILE_MISSING", resourceId });
          }
        }
        check();
        return {
          source: "saved_api_data",
          root: summary(root),
          graph: graph.slice(0, 500),
          issues: issues.slice(0, 200),
          coverage: {
            scope: "explicit_editor_references",
            fullSite: false,
            atomicSnapshot: false,
            runtimeVerified: false,
            reads,
            truncated: truncated || graph.length > 500 || issues.length > 200,
            unresolved: unknown,
            scriptsAndDynamicReferencesInspected: false,
          },
          nextStep:
            "按引用位置核对缺口；不可用可能是权限或临时故障，不能据此自动删除。保存后重新分析。",
        };
      },
    },
    {
      name: "xrugc_find_entity_usage",
      description:
        "检查实体关联表中的可访问场景，并区分仍有实例与只有关联的情况。按候选分页；不会泄露无权读取的场景 ID/标题，不能证明全站无引用。",
      inputSchema: {
        type: "object",
        properties: {
          ...props,
          offset: { type: "integer", minimum: 0, default: 0 },
        },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(raw) {
        const check = guard();
        const { value, targetId, max } = input(raw);
        const offset = value.offset ?? 0;
        if (
          typeof offset !== "number" ||
          !Number.isSafeInteger(offset) ||
          offset < 0
        )
          throw new Error("offset 无效");
        const entity = await d.read("entity", targetId);
        check();
        const candidates = [...new Set(entity.relatedSceneIds ?? [])].filter(
          (n) => id(n) !== null
        );
        const usages: Array<Record<string, unknown>> = [];
        let unresolved = false;
        let truncated = false;
        for (const sceneId of candidates.slice(offset, offset + max)) {
          try {
            const scene = await d.read("scene", sceneId);
            check();
            const scan = collectAuthoringReferences(scene.data, "scene");
            const positions = scan.references.filter(
              (ref) => ref.id === targetId
            );
            truncated ||= scan.truncated;
            usages.push({
              scene: summary(scene),
              relation: positions.length
                ? "instantiated"
                : scan.truncated || scan.invalid
                  ? "unknown"
                  : "associated_only",
              referenceCount: positions.length,
              references: positions.slice(0, 20),
            });
            if (positions.length > 20) truncated = true;
          } catch {
            check();
            unresolved = true;
          }
        }
        check();
        return {
          entity: summary(entity),
          usages,
          nextOffset: offset + max < candidates.length ? offset + max : null,
          coverage: {
            source: "association_candidates",
            fullSite: false,
            atomicSnapshot: false,
            unresolved,
            truncated,
            relationAvailable: Array.isArray(entity.relatedSceneIds),
            dynamicReferencesInspected: false,
          },
          impact:
            "这些场景使用当前实体数据；固定发布快照不会因本次实体修改而改写。关联表可能不含未保存或动态引用，不可据此认定无其他影响。",
        };
      },
    },
  ];
}
