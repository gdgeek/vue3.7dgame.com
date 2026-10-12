import { describe, expect, it, vi } from "vitest";
import type { MetaInfo } from "@/api/v1/types/meta";
import type { VerseData } from "@/api/v1/verse";
import {
  checkSceneReadiness,
  inspectEntityReadiness,
} from "@/services/webmcp/scene-reliability-tools";

const entity = () =>
  ({
    id: 1,
    data: { children: { entities: [{ parameters: { resource: 4 } }] } },
    resources: [
      {
        id: 4,
        type: "polygen",
        file: { url: "https://asset.invalid/model?token=private" },
        info: "{}",
      },
    ],
  }) as unknown as MetaInfo;
const setup = () => ({
  getContext: () => ({
    scene: { id: 2, editable: true } as VerseData,
    ready: true,
    loading: false,
    dirty: false,
  }),
  getLiveState: vi.fn(async () => ({
    verse: {
      children: {
        modules: [
          { parameters: { meta_id: 1 } },
          { parameters: { meta_id: 1 } },
        ],
      },
    },
    sceneVersion: "a",
    changed: false,
    loading: false,
    selectedModuleIds: [],
  })),
  readEntityForReadiness: vi.fn(async () => entity()),
});
describe("scene reliability", () => {
  it("deduplicates entities and never equates metadata with runtime readiness or exposes URLs", async () => {
    const options = setup();
    const result = await checkSceneReadiness(options);
    expect(result.metadataReady).toBe(true);
    expect(result.runtimeReady).toBe("unknown");
    expect(options.readEntityForReadiness).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.entities[0].assets[0].initialization).toBe("unknown");
  });
  it("blocks missing referenced assets", () => {
    const model = entity();
    model.resources = [];
    expect(inspectEntityReadiness(model)).toMatchObject({
      metadataReady: false,
      missingResourceIds: ["4"],
    });
  });
  it("blocks missing files and malformed entity data", () => {
    const model = entity();
    model.resources[0].file.url = "";
    model.data = "bad json";
    expect(inspectEntityReadiness(model).issues).toContain(
      "ENTITY_DATA_UNAVAILABLE"
    );
    model.data = entity().data;
    expect(inspectEntityReadiness(model).issues).toContain(
      "RESOURCE_FILE_MISSING"
    );
  });
  it("does not mistake absent inventory for empty verified inventory", () => {
    const model = entity();
    delete (model as Partial<MetaInfo>).resources;
    expect(inspectEntityReadiness(model).issues).toContain(
      "RESOURCE_INVENTORY_UNAVAILABLE"
    );
  });
  it("blocks stale results if version changes during API reads", async () => {
    const options = setup();
    options.readEntityForReadiness.mockImplementation(async () => {
      options.getLiveState.mockResolvedValue({
        ...(await setup().getLiveState()),
        sceneVersion: "b",
      });
      return entity();
    });
    expect((await checkSceneReadiness(options)).blockers).toContain(
      "SCENE_CHANGED_DURING_CHECK"
    );
  });
  it("sanitizes failed API responses and does not report success", async () => {
    const options = setup();
    options.readEntityForReadiness.mockRejectedValue(
      new Error("token=private")
    );
    const result = await checkSceneReadiness(options);
    expect(result.metadataReady).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.failures[0].code).toBe("ENTITY_READ_FAILED");
  });
  it("reports mutually exclusive components on the same node", () => {
    const model = entity();
    model.data = {
      children: {
        entities: [
          { children: { components: [{ type: "Action" }, { type: "Moved" }] } },
        ],
      },
    };
    expect(inspectEntityReadiness(model).issues).toContain(
      "INTERACTION_COMPONENT_CONFLICT"
    );
  });
  it("blocks unsaved scenes", async () => {
    const options = setup();
    options.getLiveState.mockResolvedValue({
      ...(await options.getLiveState()),
      changed: true,
    });
    expect((await checkSceneReadiness(options)).blockers).toContain(
      "UNSAVED_CHANGES"
    );
  });
});
