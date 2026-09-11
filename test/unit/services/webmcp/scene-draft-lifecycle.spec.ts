import { afterEach, describe, expect, it, vi } from "vitest";
import { createSceneEntityPlacementTools } from "@/services/webmcp/scene-entity-placement-tools";
import { createSceneModuleTransformTools } from "@/services/webmcp/scene-module-transform-tools";
import { createSceneModulePropertyTools } from "@/services/webmcp/scene-module-property-tools";
import { createSceneModuleDeletionTools } from "@/services/webmcp/scene-module-deletion-tools";
import { createScenePublicationTools } from "@/services/webmcp/scene-publication-tools";

afterEach(() => vi.useRealTimers());
const cases = [
  {
    name: "placement",
    factory: createSceneEntityPlacementTools,
    input: { entityId: 1 },
  },
  {
    name: "transform",
    factory: createSceneModuleTransformTools,
    input: { moduleId: "m", transform: { position: { x: 1 } } },
  },
  {
    name: "properties",
    factory: createSceneModulePropertyTools,
    input: { moduleId: "m", properties: { title: "new" } },
  },
  {
    name: "deletion",
    factory: createSceneModuleDeletionTools,
    input: { moduleId: "m" },
  },
  { name: "publication", factory: createScenePublicationTools, input: {} },
];
describe.each(cases)("$name draft lifecycle", ({ input, factory }) => {
  const setup = async () => {
    let sceneId = 1;
    let resolve!: (value: boolean) => void;
    const confirm = vi.fn(
      () =>
        new Promise<boolean>((done) => {
          resolve = done;
        })
    );
    const complete = vi.fn().mockResolvedValue({});
    const stage = vi.fn().mockResolvedValue({ sceneId: 1, changed: true });
    const tools = factory({
      getSceneId: () => sceneId,
      stageEntityPlacement: stage,
      confirmEntityPlacement: confirm,
      completeEntityPlacement: complete,
      stageModuleTransform: stage,
      confirmModuleTransform: confirm,
      completeModuleTransform: complete,
      stageModuleProperties: stage,
      confirmModuleProperties: confirm,
      completeModuleProperties: complete,
      stageModuleDeletion: stage,
      confirmModuleDeletion: confirm,
      completeModuleDeletion: complete,
      stageScenePublication: stage,
      confirmScenePublication: confirm,
      completeScenePublication: complete,
    });
    const staged = (await tools[0].execute(input)) as { draftId: string };
    return {
      tools,
      staged,
      confirm,
      complete,
      resolve: () => resolve(true),
      changeScene: () => {
        sceneId = 2;
      },
    };
  };
  it("consumes a draft before confirmation to prevent concurrent replay", async () => {
    const s = await setup();
    const first = s.tools[1].execute(s.staged);
    await expect(s.tools[1].execute(s.staged)).resolves.toMatchObject({
      status: "expired_or_missing",
    });
    expect(s.confirm).toHaveBeenCalledTimes(1);
    s.resolve();
    await expect(first).resolves.toMatchObject({ status: "completed" });
    expect(s.complete).toHaveBeenCalledTimes(1);
  });
  it("keeps the oldest draft usable when the draft store is exactly full", async () => {
    const s = await setup();
    const capacity = factory === createScenePublicationTools ? 10 : 20;
    for (let i = 1; i < capacity; i += 1) await s.tools[0].execute(input);
    const first = s.tools[1].execute(s.staged);
    expect(s.confirm).toHaveBeenCalledTimes(1);
    s.resolve();
    await expect(first).resolves.toMatchObject({ status: "completed" });
  });
  it("rejects expiration while the confirmation dialog is open", async () => {
    vi.useFakeTimers();
    const s = await setup();
    const first = s.tools[1].execute(s.staged);
    vi.advanceTimersByTime(5 * 60 * 1000);
    s.resolve();
    await expect(first).resolves.toMatchObject({
      status: "expired_or_missing",
    });
    expect(s.complete).not.toHaveBeenCalled();
  });
  it("rejects a scene switch during confirmation", async () => {
    const s = await setup();
    const first = s.tools[1].execute(s.staged);
    s.changeScene();
    s.resolve();
    await expect(first).resolves.toMatchObject({ status: "scene_changed" });
    expect(s.complete).not.toHaveBeenCalled();
  });
});
