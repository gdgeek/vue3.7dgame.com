import { describe, expect, it, vi } from "vitest";
import type { MetaInfo } from "@/api/v1/types/meta";
import {
  buildEntityAssetUsage,
  createEntityAssetLifecycleTools,
  type AssetRenamePreview,
} from "@/services/webmcp/entity-asset-lifecycle-tools";

const createEntity = (): MetaInfo =>
  ({
    id: 35,
    title: "中国空间站",
    resources: [
      { id: 7, type: "polygen", name: "Root.glb" },
      { id: 8, type: "picture", name: "核心舱模块介绍.png" },
    ],
    data: {
      children: {
        entities: [
          {
            uuid: "root-node",
            type: "polygen",
            parameters: { name: "Root", resource: 7 },
            children: {
              entities: [
                {
                  uuid: "missing-node",
                  type: "picture",
                  parameters: { name: "缺失图片", resource: 999 },
                },
              ],
            },
          },
        ],
      },
    },
  }) as unknown as MetaInfo;

const renamePreview: AssetRenamePreview = {
  entityId: 35,
  resourceId: 7,
  resourceType: "polygen",
  currentName: "Root.glb",
  proposedName: "空间站总装.glb",
  resourceUpdatedAt: "2026-08-31T00:00:00Z",
};

describe("entity asset lifecycle WebMCP tools", () => {
  it("reports used, unused, and missing resource references", () => {
    const usage = buildEntityAssetUsage(createEntity());
    expect(usage).toMatchObject({
      entityId: 35,
      resourceCount: 2,
      usedResourceCount: 1,
      unusedResourceCount: 1,
      missingResourceCount: 1,
      truncated: false,
    });
    expect(usage.assets[0]).toMatchObject({
      resourceId: 7,
      referenceCount: 1,
      status: "used",
    });
    expect(usage.assets[1]).toMatchObject({
      resourceId: 8,
      referenceCount: 0,
      status: "unused",
    });
    expect(usage.missingResources[0]).toMatchObject({
      resourceId: "999",
      referenceCount: 1,
    });
  });

  it("starts the real upload workflow without accepting a file path", async () => {
    const startAssetUpload = vi.fn().mockResolvedValue({
      opened: true,
      resourceType: "picture",
      url: "/resource/picture/index?webmcpUpload=1",
    });
    const tools = createEntityAssetLifecycleTools({
      getEntity: createEntity,
      startAssetUpload,
      stageAssetRename: vi.fn(),
      confirmAssetRename: vi.fn(),
      completeAssetRename: vi.fn(),
    });

    await expect(
      tools[1].execute({ resourceType: "picture", filePath: "/tmp/a.png" })
    ).resolves.toMatchObject({
      status: "opened",
      requiresUserFileSelection: true,
    });
    expect(startAssetUpload).toHaveBeenCalledWith("picture");
  });

  it("stages, confirms, and completes a resource rename", async () => {
    const completeAssetRename = vi.fn().mockResolvedValue({
      resourceId: 7,
      resourceType: "polygen",
      resourceName: "空间站总装.glb",
    });
    const tools = createEntityAssetLifecycleTools({
      getEntity: createEntity,
      startAssetUpload: vi.fn(),
      stageAssetRename: vi.fn().mockResolvedValue(renamePreview),
      confirmAssetRename: vi.fn().mockResolvedValue(true),
      completeAssetRename,
    });

    const staged = (await tools[2].execute({
      resourceType: "polygen",
      resourceId: 7,
      name: " 空间站总装.glb ",
    })) as { draftId: string };
    await expect(
      tools[3].execute({ draftId: staged.draftId })
    ).resolves.toEqual(
      expect.objectContaining({
        status: "completed",
        resourceId: 7,
        resourceName: "空间站总装.glb",
      })
    );
    expect(completeAssetRename).toHaveBeenCalledWith(renamePreview);
  });

  it("does not complete a rename after the entity changes", async () => {
    let entity = createEntity();
    const completeAssetRename = vi.fn();
    const tools = createEntityAssetLifecycleTools({
      getEntity: () => entity,
      startAssetUpload: vi.fn(),
      stageAssetRename: vi.fn().mockResolvedValue(renamePreview),
      confirmAssetRename: vi.fn().mockResolvedValue(true),
      completeAssetRename,
    });

    const staged = (await tools[2].execute({
      resourceType: "polygen",
      resourceId: 7,
      name: "空间站总装.glb",
    })) as { draftId: string };
    entity = { ...entity, id: 36 };
    await expect(
      tools[3].execute({ draftId: staged.draftId })
    ).resolves.toEqual(expect.objectContaining({ status: "entity_changed" }));
    expect(completeAssetRename).not.toHaveBeenCalled();
  });

  it("validates lifecycle inputs", async () => {
    const tools = createEntityAssetLifecycleTools({
      getEntity: createEntity,
      startAssetUpload: vi.fn(),
      stageAssetRename: vi.fn(),
      confirmAssetRename: vi.fn(),
      completeAssetRename: vi.fn(),
    });
    await expect(tools[0].execute({ maxReferences: 501 })).rejects.toThrow(
      "500"
    );
    await expect(tools[1].execute({ resourceType: "script" })).rejects.toThrow(
      "不支持"
    );
    await expect(
      tools[2].execute({ resourceType: "audio", resourceId: 0, name: "声音" })
    ).rejects.toThrow("resourceId");
  });
});
