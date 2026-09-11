import { describe, expect, it, vi } from "vitest";
import type { MetaInfo } from "@/api/v1/types/meta";
import {
  buildEntityTree,
  inspectEntityNode,
  registerEntityEditorWebMcpTools,
  validateEntity,
} from "@/services/webmcp/entity-editor-tools";

const createEntity = (): MetaInfo =>
  ({
    id: 35,
    uuid: "entity-uuid",
    title: "中国空间站",
    editable: true,
    viewable: true,
    resources: [
      { id: 7, type: "polygen", name: "Root.glb" },
      { id: 8, type: "picture", name: "核心舱模块介绍.png" },
    ],
    data: {
      children: {
        entities: [
          {
            uuid: "root-node",
            type: "group",
            parameters: { name: "Root.glb", resource: 7 },
            children: {
              entities: [
                {
                  uuid: "core-node",
                  type: "polygen",
                  parameters: {
                    name: "中国空间站_核心舱模块.glb",
                    resource: 7,
                    position: { x: 0, y: 0, z: 0 },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  }) as unknown as MetaInfo;

describe("entity editor WebMCP tools", () => {
  it("builds a bounded entity tree", () => {
    const result = buildEntityTree(createEntity(), { maxDepth: 10 });
    expect(result.entityId).toBe(35);
    expect(result.nodeCount).toBe(2);
    expect(result.tree[0]).toMatchObject({
      id: "root-node",
      path: "0",
      name: "Root.glb",
      childCount: 1,
    });
  });

  it("never exceeds the requested node limit", () => {
    const result = buildEntityTree(createEntity(), { maxNodes: 1 });
    expect(result.nodeCount).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it("inspects a node by hierarchy path", () => {
    expect(inspectEntityNode(createEntity(), { path: "0/0" })).toMatchObject({
      found: true,
      id: "core-node",
      name: "中国空间站_核心舱模块.glb",
      resourceId: 7,
    });
  });

  it("redacts file and credential-like values from node output", () => {
    const entity = createEntity();
    const data = entity.data as {
      children: {
        entities: Array<{
          parameters: Record<string, unknown>;
        }>;
      };
    };
    data.children.entities[0].parameters.token = "do-not-return";
    data.children.entities[0].parameters.fileUrl = "signed-url";

    const result = inspectEntityNode(entity, { path: "0" }) as {
      parameters: Record<string, unknown>;
    };
    expect(result.parameters).not.toHaveProperty("token");
    expect(result.parameters).not.toHaveProperty("fileUrl");
  });

  it("reports invalid resource references", () => {
    const entity = createEntity();
    const data = entity.data as {
      children: { entities: Array<{ parameters: { resource: number } }> };
    };
    data.children.entities[0].parameters.resource = 999;
    const result = validateEntity(entity);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("999");
  });

  it("reads live editor content and unregisters every tool with the page", async () => {
    const registered: Array<{
      tool: { name: string; execute: (input: unknown) => unknown };
      signal?: AbortSignal;
    }> = [];
    const fakeDocument = {
      modelContext: {
        registerTool: (
          tool: { name: string; execute: (input: unknown) => unknown },
          options?: { signal?: AbortSignal }
        ) => registered.push({ tool, signal: options?.signal }),
      },
    } as unknown as Document;

    const lifecycle = registerEntityEditorWebMcpTools({
      document: fakeDocument,
      getContext: () => ({
        entity: createEntity(),
        dirty: false,
        loading: false,
        sceneNames: ["空间站展厅"],
      }),
      getLiveContext: async () => ({
        entity: {
          ...createEntity(),
          data: {
            children: {
              entities: [
                {
                  uuid: "live-node",
                  type: "group",
                  parameters: { name: "Live unsaved node", resource: 999 },
                },
              ],
            },
          },
        } as MetaInfo,
        dirty: true,
        loading: false,
        sceneNames: [],
        source: "live-editor",
        entityVersion: "revision-live",
        contextGeneration: 3,
      }),
      searchAssets: vi.fn().mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
      }),
      stageNodeTransform: vi.fn(),
      confirmNodeTransform: vi.fn(),
      completeNodeTransform: vi.fn(),
      stageNodeProperties: vi.fn(),
      confirmNodeProperties: vi.fn(),
      completeNodeProperties: vi.fn(),
      stageResourcePlacement: vi.fn(),
      confirmResourcePlacement: vi.fn(),
      completeResourcePlacement: vi.fn(),
      stageNodeReparent: vi.fn(),
      confirmNodeReparent: vi.fn(),
      completeNodeReparent: vi.fn(),
      stageNodeDeletion: vi.fn(),
      confirmNodeDeletion: vi.fn(),
      completeNodeDeletion: vi.fn(),
      stageNodeReorder: vi.fn(),
      confirmNodeReorder: vi.fn(),
      completeNodeReorder: vi.fn(),
      stageNodeClone: vi.fn(),
      confirmNodeClone: vi.fn(),
      completeNodeClone: vi.fn(),
      stageNodeBatch: vi.fn(),
      confirmNodeBatch: vi.fn(),
      completeNodeBatch: vi.fn(),
      startAssetUpload: vi.fn(),
      stageAssetRename: vi.fn(),
      confirmAssetRename: vi.fn(),
      completeAssetRename: vi.fn(),
      getNodeComponents: vi.fn(),
      stageComponentBatch: vi.fn(),
      confirmComponentBatch: vi.fn(),
      completeComponentBatch: vi.fn(),
      getEntitySignals: vi.fn(),
      stageSignalBatch: vi.fn(),
      confirmSignalBatch: vi.fn(),
      completeSignalBatch: vi.fn(),
    });

    expect(registered.map(({ tool }) => tool.name)).toEqual([
      "xrugc_get_editor_context",
      "xrugc_get_entity_tree",
      "xrugc_inspect_entity_node",
      "xrugc_validate_entity",
      "xrugc_search_assets",
      "xrugc_stage_node_transform",
      "xrugc_complete_node_transform",
      "xrugc_stage_node_properties",
      "xrugc_complete_node_properties",
      "xrugc_stage_resource_placement",
      "xrugc_complete_resource_placement",
      "xrugc_stage_node_reparent",
      "xrugc_complete_node_reparent",
      "xrugc_stage_node_deletion",
      "xrugc_complete_node_deletion",
      "xrugc_stage_node_reorder",
      "xrugc_complete_node_reorder",
      "xrugc_stage_node_clone",
      "xrugc_complete_node_clone",
      "xrugc_stage_node_batch",
      "xrugc_complete_node_batch",
      "xrugc_get_entity_asset_usage",
      "xrugc_start_asset_upload",
      "xrugc_stage_asset_rename",
      "xrugc_complete_asset_rename",
      "xrugc_get_node_components",
      "xrugc_stage_component_batch",
      "xrugc_complete_component_batch",
      "xrugc_get_entity_signals",
      "xrugc_stage_signal_batch",
      "xrugc_complete_signal_batch",
    ]);
    expect(registered.every(({ signal }) => !signal?.aborted)).toBe(true);

    await expect(registered[0].tool.execute({})).resolves.toMatchObject({
      source: "live-editor",
      dirty: true,
      entityVersion: "revision-live",
      contextGeneration: 3,
    });
    await expect(registered[1].tool.execute({})).resolves.toMatchObject({
      nodeCount: 1,
      tree: [{ id: "live-node", name: "Live unsaved node" }],
    });
    await expect(
      registered[2].tool.execute({ nodeId: "live-node" })
    ).resolves.toMatchObject({ found: true, resourceId: 999 });
    await expect(registered[3].tool.execute({})).resolves.toMatchObject({
      valid: false,
    });
    const usageTool = registered.find(
      ({ tool }) => tool.name === "xrugc_get_entity_asset_usage"
    )!.tool;
    await expect(usageTool.execute({})).resolves.toMatchObject({
      missingResourceCount: 1,
      missingResources: [{ resourceId: "999", referenceCount: 1 }],
    });
    lifecycle?.abort();
    expect(registered.every(({ signal }) => signal?.aborted)).toBe(true);
  });
});
