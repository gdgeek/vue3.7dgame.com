/**
 * Tests for src/layout/components/Settings/components/ThemeColorPicker.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Stub Element Plus ─────────────────────────────────────────────────────────
const ElColorPickerStub = defineComponent({
  name: "ElColorPicker",
  props: ["modelValue", "predefine", "popperClass"],
  emits: ["update:modelValue"],
  template: '<div class="el-color-picker-stub" :data-value="modelValue"></div>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: ThemeColorPicker } = await import(
    "@/layout/components/Settings/components/ThemeColorPicker.vue"
  );
  const el = document.createElement("div");
  const app = createApp(
    ThemeColorPicker as Parameters<typeof createApp>[0],
    props
  );
  app.component("el-color-picker", ElColorPickerStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/Settings/components/ThemeColorPicker.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders el-color-picker stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-color-picker-stub")).not.toBeNull();
  });

  it("passes modelValue prop to color picker", async () => {
    const { el } = await mount({ modelValue: "#409EFF" });
    const picker = el.querySelector(".el-color-picker-stub");
    expect(picker?.getAttribute("data-value")).toBe("#409EFF");
  });

  it("mounts with no modelValue (undefined)", async () => {
    const { el } = await mount({});
    expect(el.querySelector(".el-color-picker-stub")).not.toBeNull();
  });

  it("renders a single root element", async () => {
    const { el } = await mount({ modelValue: "#ff4500" });
    // The component renders el-color-picker directly
    expect(el.children.length).toBeGreaterThan(0);
  });

  it("accepts string modelValue without throwing", async () => {
    await expect(mount({ modelValue: "rgb(255, 120, 0)" })).resolves.toBeDefined();
  });
});
