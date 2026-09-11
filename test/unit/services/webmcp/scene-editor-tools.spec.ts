import { describe, expect, it, vi } from "vitest";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { VerseData } from "@/api/v1/verse";
import {
  buildSceneModuleList,
  inspectSceneModule,
  registerSceneEditorWebMcpTools,
  validateScene,
  type SceneEditorLiveState,
} from "@/services/webmcp/scene-editor-tools";

const moduleNode = (
  uuid: string,
  title: string,
  metaId: number,
  position = { x: 1, y: 2, z: 3 }
) => ({
  type: "Module",
  parameters: {
    uuid,
    title,
    meta_id: metaId,
    active: true,
    token: "must-not-leak",
    transform: {
      position,
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
  },
});

const liveState: SceneEditorLiveState = {
  verse: {
    type: "Verse",
    parameters: { uuid: "verse-runtime" },
    children: {
      modules: [
        moduleNode("module-root", "空间站", 35),
        moduleNode("module-label", "讲解牌", 41),
      ],
    },
  },
  sceneVersion: "verse-v1-test",
  changed: true,
  loading: false,
  selectedModuleIds: ["module-root"],
};

const scene = {
  id: 1420,
  uuid: "verse-1420",
  name: "中国空间站",
  editable: true,
  viewable: true,
  verseRelease: { id: 9, code: "release" },
  metas: [{ id: 35 }, { id: 41 }],
  space: { id: 3, name: "太空" },
} as VerseData;

const entity = {
  id: 35,
  uuid: "entity-35",
  title: "中国空间站",
  resources: [{ id: 1 }, { id: 2 }],
  events: { inputs: [{ uuid: "in" }], outputs: [{ uuid: "out" }] },
  image: { id: 8 },
  editable: true,
  viewable: true,
  updated_at: "2026-08-31T00:00:00.000Z",
} as MetaInfo;

const register = () => {
  const registered: Array<{
    name: string;
    execute: (input: unknown) => unknown;
    signal?: AbortSignal;
  }> = [];
  const options = {
    document: {
      modelContext: {
        registerTool: (
          tool: {
            name: string;
            execute: (input: unknown) => unknown;
          },
          registrationOptions?: { signal?: AbortSignal }
        ) =>
          registered.push({
            ...tool,
            signal: registrationOptions?.signal,
          }),
      },
    } as unknown as Document,
    getContext: vi.fn(() => ({
      scene,
      dirty: false,
      loading: false,
      ready: true,
    })),
    getLiveState: vi.fn().mockResolvedValue(liveState),
    searchEntities: vi.fn().mockResolvedValue({
      items: [entity],
      page: 2,
      pageSize: 10,
      total: 21,
    }),
    stageEntityPlacement: vi.fn(),
    confirmEntityPlacement: vi.fn(),
    completeEntityPlacement: vi.fn(),
    stageModuleTransform: vi.fn(),
    confirmModuleTransform: vi.fn(),
    completeModuleTransform: vi.fn(),
    stageModuleProperties: vi.fn(),
    confirmModuleProperties: vi.fn(),
    completeModuleProperties: vi.fn(),
    stageModuleDeletion: vi.fn(),
    confirmModuleDeletion: vi.fn(),
    completeModuleDeletion: vi.fn(),
    stageScenePublication: vi.fn(),
    confirmScenePublication: vi.fn(),
    completeScenePublication: vi.fn(),
    getPreviewStatus: vi.fn(() => ({
      sceneId: 1420,
      sceneName: "中国空间站",
      visible: false,
      frameVisible: false,
      ready: false,
      phase: "closed" as const,
      status: "预览已关闭",
    })),
    startPreview: vi.fn(),
    stopPreview: vi.fn(),
  };
  const lifecycle = registerSceneEditorWebMcpTools(options);
  return { registered, options, lifecycle };
};

describe("scene editor WebMCP tools", () => {
  it("registers five read tools and the staged placement pair", () => {
    const { registered, lifecycle } = register();
    expect(registered.map((tool) => tool.name)).toEqual([
      "xrugc_get_scene_editor_context",
      "xrugc_get_scene_modules",
      "xrugc_inspect_scene_module",
      "xrugc_validate_scene",
      "xrugc_search_entities",
      "xrugc_check_scene_resource_readiness",
      "xrugc_check_scene_publication_readiness",
      "xrugc_get_scene_runtime_diagnostics",
      "xrugc_stage_scene_entity_placement",
      "xrugc_complete_scene_entity_placement",
      "xrugc_stage_scene_module_transform",
      "xrugc_complete_scene_module_transform",
      "xrugc_stage_scene_module_properties",
      "xrugc_complete_scene_module_properties",
      "xrugc_stage_scene_module_deletion",
      "xrugc_complete_scene_module_deletion",
      "xrugc_stage_scene_publication",
      "xrugc_complete_scene_publication",
      "xrugc_get_scene_runtime_preview_status",
      "xrugc_start_scene_runtime_preview",
      "xrugc_stop_scene_runtime_preview",
    ]);
    expect(registered.every(({ signal }) => !signal?.aborted)).toBe(true);
    lifecycle?.abort();
    expect(registered.every(({ signal }) => signal?.aborted)).toBe(true);
  });

  it("reports unknown publication when the backend omits release metadata", async () => {
    const { registered, options } = register();
    const partialScene = { ...scene };
    delete (partialScene as Partial<VerseData>).verseRelease;
    options.getContext.mockReturnValue({
      scene: partialScene,
      dirty: false,
      loading: false,
      ready: true,
    });
    await expect(registered[0].execute({})).resolves.toMatchObject({
      scene: { published: null },
    });
  });

  it("reads context and unsaved selection from the visible editor", async () => {
    const { registered } = register();
    await expect(registered[0].execute({})).resolves.toMatchObject({
      editor: "scene",
      ready: true,
      dirty: true,
      scene: {
        id: 1420,
        name: "中国空间站",
        published: true,
        moduleCount: 2,
        space: { id: 3, name: "太空" },
      },
      selectedModuleIds: ["module-root"],
    });
  });

  it("filters live modules and inspects one without leaking sensitive values", async () => {
    const { registered } = register();
    await expect(
      registered[1].execute({ query: "35", limit: 10 })
    ).resolves.toMatchObject({
      moduleCount: 2,
      matchedCount: 1,
      modules: [
        {
          id: "module-root",
          title: "空间站",
          entityId: 35,
          transform: { position: { x: 1, y: 2, z: 3 } },
        },
      ],
    });

    const inspected = (await registered[2].execute({
      moduleId: "module-root",
    })) as { parameters: Record<string, unknown> };
    expect(inspected).toMatchObject({ found: true, path: "0" });
    expect(inspected.parameters).not.toHaveProperty("token");
  });

  it("validates live entity references, UUIDs and transforms", async () => {
    const { registered } = register();
    await expect(registered[3].execute({})).resolves.toMatchObject({
      valid: true,
      errors: [],
      moduleCount: 2,
      referencedEntityCount: 2,
      dirty: true,
    });

    const broken: SceneEditorLiveState = {
      ...liveState,
      verse: {
        children: {
          modules: [
            moduleNode("duplicate", "重复", 999, {
              x: Number.NaN,
              y: 0,
              z: 0,
            }),
            moduleNode("duplicate", "重复", 35),
          ],
        },
      },
    };
    const result = validateScene(scene, broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("不存在的实体 999");
    expect(result.errors.join("\n")).toContain("位置.x不是有效数字");
    expect(result.errors.join("\n")).toContain("UUID“duplicate”重复");
    expect(result.warnings.join("\n")).toContain("名称“重复”重复");
  });

  it("searches platform entities and returns concise summaries", async () => {
    const { registered, options } = register();
    await expect(
      registered[4].execute({ query: " 空间站 ", page: 2, pageSize: 10 })
    ).resolves.toEqual({
      page: 2,
      pageSize: 10,
      total: 21,
      items: [
        {
          id: 35,
          uuid: "entity-35",
          title: "中国空间站",
          resourceCount: 2,
          inputSignalCount: 1,
          outputSignalCount: 1,
          hasPreview: true,
          editable: true,
          viewable: true,
          updatedAt: "2026-08-31T00:00:00.000Z",
        },
      ],
    });
    expect(options.searchEntities).toHaveBeenCalledWith({
      query: "空间站",
      page: 2,
      pageSize: 10,
    });
  });

  it("handles direct list/inspection helpers and rejects an empty selector", async () => {
    expect(buildSceneModuleList(liveState.verse, { limit: 1 })).toMatchObject({
      moduleCount: 2,
      matchedCount: 2,
      truncated: true,
    });
    expect(
      inspectSceneModule(liveState.verse, { title: "不存在" })
    ).toMatchObject({ found: false });

    const { registered } = register();
    await expect(registered[2].execute({})).rejects.toThrow("至少需要提供一个");
  });
});
