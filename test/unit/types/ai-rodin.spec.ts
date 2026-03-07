/**
 * 类型模块单元测试 - src/types/ai-rodin.ts
 * 验证 AiRodinQuality、AiRodinQuery、AiRodinItem 接口结构
 */
import { describe, it, expect } from "vitest";
import type {
  AiRodinQuality,
  AiRodinQuery,
  AiRodinItem,
} from "@/types/ai-rodin";

describe("AiRodinQuality 类型", () => {
  it("可以是 high", () => {
    const q: AiRodinQuality = "high";
    expect(q).toBe("high");
  });

  it("可以是 medium", () => {
    const q: AiRodinQuality = "medium";
    expect(q).toBe("medium");
  });

  it("可以是 low", () => {
    const q: AiRodinQuality = "low";
    expect(q).toBe("low");
  });

  it("可以是 extra-low", () => {
    const q: AiRodinQuality = "extra-low";
    expect(q).toBe("extra-low");
  });

  it("四个枚举值数组正确", () => {
    const vals: AiRodinQuality[] = ["high", "medium", "low", "extra-low"];
    expect(vals).toHaveLength(4);
  });
});

describe("AiRodinQuery 接口", () => {
  it("可以创建空对象（所有字段可选）", () => {
    const q: AiRodinQuery = {};
    expect(q).toBeDefined();
  });

  it("prompt 字段赋值", () => {
    const q: AiRodinQuery = { prompt: "a robot" };
    expect(q.prompt).toBe("a robot");
  });

  it("quality 字段赋值", () => {
    const q: AiRodinQuery = { quality: "high" };
    expect(q.quality).toBe("high");
  });

  it("resource_id 字段赋值", () => {
    const q: AiRodinQuery = { resource_id: 42 };
    expect(q.resource_id).toBe(42);
  });

  it("所有字段组合赋值", () => {
    const q: AiRodinQuery = {
      prompt: "a dragon",
      quality: "medium",
      resource_id: 99,
    };
    expect(q.prompt).toBe("a dragon");
    expect(q.quality).toBe("medium");
    expect(q.resource_id).toBe(99);
  });
});

describe("AiRodinItem 接口", () => {
  it("必填字段 id 和 step 正常赋值", () => {
    const item: AiRodinItem = { id: 1, step: 3, query: {} };
    expect(item.id).toBe(1);
    expect(item.step).toBe(3);
  });

  it("name 字段可选", () => {
    const item: AiRodinItem = { id: 1, step: 0, query: {}, name: "Model A" };
    expect(item.name).toBe("Model A");
  });

  it("resource_id 字段可选", () => {
    const item: AiRodinItem = { id: 2, step: 1, query: {}, resource_id: 100 };
    expect(item.resource_id).toBe(100);
  });

  it("query 字段包含完整 AiRodinQuery", () => {
    const item: AiRodinItem = {
      id: 3,
      step: 2,
      query: { prompt: "a car", quality: "low", resource_id: 5 },
    };
    expect(item.query.prompt).toBe("a car");
    expect(item.query.quality).toBe("low");
  });
});
