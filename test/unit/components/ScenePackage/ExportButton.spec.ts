/**
 * Tests for src/components/ScenePackage/ExportButton.vue
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createApp, defineComponent } from "vue";

const mockExportScene = vi.fn();
vi.mock("@/services/scene-package/export-service", () => ({
  exportScene: mockExportScene,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock("@element-plus/icons-vue", () => ({
  Download: {},
}));

const ElMessageSuccess = vi.fn();
const ElMessageError = vi.fn();
(globalThis as unknown as Record<string, unknown>).ElMessage = {
  success: ElMessageSuccess,
  error: ElMessageError,
};

// Stub Element Plus components
const ElTooltipStub = defineComponent({
  name: "ElTooltip",
  props: ["content", "placement"],
  template: "<div class='el-tooltip-stub'><slot /></div>",
});

const ElButtonStub = defineComponent({
  name: "ElButton",
  props: ["type", "loading", "icon"],
  emits: ["click"],
  template: "<button class='el-button-stub' @click=\"$emit('click')\"><slot /></button>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
  ElMessageSuccess.mockClear();
  ElMessageError.mockClear();
  mockExportScene.mockClear();
});

async function mount(props: Record<string, unknown> = { verseId: 42 }) {
  const { default: ExportButton } = await import(
    "@/components/ScenePackage/ExportButton.vue"
  );
  const el = document.createElement("div");
  const app = createApp(ExportButton as Parameters<typeof createApp>[0], props);
  app.component("ElTooltip", ElTooltipStub);
  app.component("ElButton", ElButtonStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("ScenePackage/ExportButton.vue", () => {
  beforeEach(() => {
    mockExportScene.mockResolvedValue(undefined);
  });

  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-tooltip-stub wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-tooltip-stub")).not.toBeNull();
  });

  it("renders el-button-stub inside tooltip", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-button-stub")).not.toBeNull();
  });

  it("clicking button calls exportScene with verseId", async () => {
    mockExportScene.mockResolvedValue(undefined);
    const { el } = await mount({ verseId: 7 });
    const btn = el.querySelector(".el-button-stub") as HTMLButtonElement;
    btn.click();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockExportScene).toHaveBeenCalledWith(7);
  });

  it("shows success message after successful export", async () => {
    mockExportScene.mockResolvedValue(undefined);
    const { el } = await mount({ verseId: 1 });
    const btn = el.querySelector(".el-button-stub") as HTMLButtonElement;
    btn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(ElMessageSuccess).toHaveBeenCalled();
  });

  it("shows error message when export throws", async () => {
    mockExportScene.mockRejectedValue(new Error("network error"));
    const { el } = await mount({ verseId: 99 });
    const btn = el.querySelector(".el-button-stub") as HTMLButtonElement;
    btn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(ElMessageError).toHaveBeenCalled();
  });
});
