/**
 * Tests for src/views/ai/generation.vue
 * AI generation page: shows AIUpload or AIProcess based on loaded data.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

const mockRouteQuery: Record<string, string> = {};

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => ({ query: mockRouteQuery })),
}));

const mockGetAiRodin = vi.fn();
vi.mock("@/api/v1/ai-rodin", () => ({
  get: mockGetAiRodin,
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), log: vi.fn() },
}));

vi.mock("@/components/MrPP/AIUpload.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({ name: "AIUpload", template: "<div class='ai-upload-stub'></div>" }),
  };
});

vi.mock("@/components/MrPP/AIProcess.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "AIProcess",
      props: ["data"],
      template: "<div class='ai-process-stub'></div>",
    }),
  };
});

const cleanups: (() => void)[] = [];
beforeEach(() => {
  mockGetAiRodin.mockReset();
});
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  for (const k of Object.keys(mockRouteQuery)) delete mockRouteQuery[k];
});

async function mount() {
  const { default: GenerationView } = await import(
    "@/views/ai/generation.vue"
  );
  const el = document.createElement("div");
  const app = createApp(GenerationView as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

describe("views/ai/generation.vue", () => {
  it("mounts without throwing (no id)", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("shows AIUpload when data is null (no id)", async () => {
    const { el } = await mount();
    await nextTick();
    expect(el.querySelector(".ai-upload-stub")).not.toBeNull();
  });

  it("does not show AIProcess when data is null", async () => {
    const { el } = await mount();
    await nextTick();
    expect(el.querySelector(".ai-process-stub")).toBeNull();
  });

  it("renders outer div wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("calls api.get when id query param is provided", async () => {
    mockRouteQuery.id = "5";
    mockGetAiRodin.mockResolvedValueOnce({ data: { id: 5, status: "done" } });
    await mount();
    await nextTick();
    expect(mockGetAiRodin).toHaveBeenCalledWith(5);
  });

  it("does not call api.get when no id param", async () => {
    await mount();
    await nextTick();
    expect(mockGetAiRodin).not.toHaveBeenCalled();
  });
});
