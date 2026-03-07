/**
 * Unit tests for src/components/ScenePlayer/types.ts
 * Verifies that type-shape objects can be constructed at runtime.
 */
import { describe, it, expect } from "vitest";
import type {
  TransformAxis,
  TransformData,
  ComponentParameters,
  EntityComponent,
  EntityParameters,
  EntityNode,
  MetaData,
  ModuleParameters,
  SourceAudioData,
  ResourceLike,
  VerseMetaInfo,
} from "@/components/ScenePlayer/types";

describe("ScenePlayer types", () => {
  describe("TransformAxis", () => {
    it("can be constructed with x, y, z numbers", () => {
      const axis: TransformAxis = { x: 1, y: 2, z: 3 };
      expect(axis.x).toBe(1);
      expect(axis.y).toBe(2);
      expect(axis.z).toBe(3);
    });

    it("supports zero values", () => {
      const axis: TransformAxis = { x: 0, y: 0, z: 0 };
      expect(axis).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe("TransformData", () => {
    it("groups position, rotate, scale", () => {
      const td: TransformData = {
        position: { x: 1, y: 0, z: 0 },
        rotate: { x: 0, y: 90, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };
      expect(td.position.x).toBe(1);
      expect(td.rotate.y).toBe(90);
      expect(td.scale.x).toBe(1);
    });
  });

  describe("ComponentParameters", () => {
    it("requires uuid field", () => {
      const cp: ComponentParameters = { uuid: "abc-123" };
      expect(cp.uuid).toBe("abc-123");
    });

    it("supports optional target and speed", () => {
      const cp: ComponentParameters = {
        uuid: "u1",
        target: "u2",
        speed: { x: 1, y: 0, z: 0 },
      };
      expect(cp.target).toBe("u2");
      expect(cp.speed?.x).toBe(1);
    });
  });

  describe("EntityComponent", () => {
    it("holds type and parameters", () => {
      const ec: EntityComponent = {
        type: "Action",
        parameters: { uuid: "event-uuid" },
      };
      expect(ec.type).toBe("Action");
      expect(ec.parameters.uuid).toBe("event-uuid");
    });
  });

  describe("EntityParameters", () => {
    it("requires uuid", () => {
      const ep: EntityParameters = { uuid: "entity-1" };
      expect(ep.uuid).toBe("entity-1");
    });

    it("supports all optional fields", () => {
      const ep: EntityParameters = {
        uuid: "e1",
        name: "cube",
        active: true,
        loop: false,
        volume: 0.5,
        color: "#ff0000",
        fontSize: 14,
      };
      expect(ep.name).toBe("cube");
      expect(ep.active).toBe(true);
    });
  });

  describe("EntityNode", () => {
    it("holds type, parameters, and optional children", () => {
      const node: EntityNode = {
        type: "model",
        parameters: { uuid: "m1" },
        children: {
          entities: [],
          components: [],
        },
      };
      expect(node.type).toBe("model");
      expect(node.children?.entities).toHaveLength(0);
    });
  });

  describe("MetaData", () => {
    it("has optional children with entities", () => {
      const md: MetaData = {
        children: { entities: [{ type: "model", parameters: { uuid: "n1" } }] },
      };
      expect(md.children?.entities).toHaveLength(1);
    });

    it("can be empty", () => {
      const md: MetaData = {};
      expect(md.children).toBeUndefined();
    });
  });

  describe("ModuleParameters", () => {
    it("requires uuid and allows extra keys", () => {
      const mp: ModuleParameters = {
        uuid: "mod-1",
        meta_id: 42,
        extra: "value",
      };
      expect(mp.uuid).toBe("mod-1");
      expect(mp.meta_id).toBe(42);
      expect(mp["extra"]).toBe("value");
    });
  });

  describe("SourceAudioData", () => {
    it("holds url string", () => {
      const sad: SourceAudioData = { url: "https://cdn.example.com/audio.mp3" };
      expect(sad.url).toContain("audio.mp3");
    });
  });

  describe("ResourceLike", () => {
    it("accepts object with type and id", () => {
      const rl: ResourceLike = { type: "picture", id: 1 };
      expect(rl.type).toBe("picture");
    });
  });

  describe("VerseMetaInfo", () => {
    it("requires id and allows optional data/events", () => {
      const vmi: VerseMetaInfo = { id: "v-1", data: undefined, events: null };
      expect(vmi.id).toBe("v-1");
    });

    it("id can be a number", () => {
      const vmi: VerseMetaInfo = { id: 99 };
      expect(vmi.id).toBe(99);
    });
  });
});
