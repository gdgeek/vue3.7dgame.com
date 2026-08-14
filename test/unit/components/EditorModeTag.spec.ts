import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import EditorModeTag from "@/components/EditorModeTag.vue";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups.length = 0;
});

const mount = async (
  mode: "script" | "scene" | "entity" = "script",
  dirty = false
) => {
  const host = document.createElement("div");
  const app = createApp({
    render: () =>
      h(EditorModeTag, {
        label: "脚本编辑",
        mode,
        dirty,
      }),
  });
  app.mount(host);
  cleanups.push(() => app.unmount());
  await nextTick();
  return host;
};

describe("components/EditorModeTag.vue", () => {
  it("renders the mode as a non-interactive current-page tag", async () => {
    const host = await mount();
    const tag = host.querySelector(".editor-mode-tag");

    expect(tag?.tagName).toBe("SPAN");
    expect(tag?.getAttribute("aria-current")).toBe("page");
    expect(tag?.textContent).toContain("脚本编辑");
    expect(tag?.querySelector("svg")?.getAttribute("data-icon")).toBe("code");
  });

  it.each([
    ["script", "code"],
    ["scene", "layer-group"],
    ["entity", "cube"],
  ] as const)("uses the shared icon format for %s mode", async (mode, icon) => {
    const host = await mount(mode);
    const modeIcon = host.querySelector(".editor-mode-tag__icon");
    const modeIconGlyph = modeIcon?.querySelector("svg");

    expect(modeIcon?.tagName).toBe("SPAN");
    expect(modeIcon?.getAttribute("aria-hidden")).toBe("true");
    expect(modeIconGlyph?.getAttribute("data-icon")).toBe(icon);
  });

  it("keeps the unsaved marker inside the tag", async () => {
    const host = await mount("script", true);
    const dirty = host.querySelector(".editor-mode-tag__dirty");

    expect(dirty).not.toBeNull();
    expect(dirty?.getAttribute("aria-hidden")).toBe("true");
  });
});
