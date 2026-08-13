import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import EditorModeTag from "@/components/EditorModeTag.vue";

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  cleanups.length = 0;
});

const mount = async (dirty = false) => {
  const host = document.createElement("div");
  const app = createApp({
    render: () =>
      h(EditorModeTag, {
        label: "脚本编辑",
        mode: "script",
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
    expect(tag?.textContent).toContain("</>");
    expect(tag?.textContent).toContain("脚本编辑");
  });

  it("keeps the unsaved marker inside the tag", async () => {
    const host = await mount(true);
    const dirty = host.querySelector(".editor-mode-tag__dirty");

    expect(dirty).not.toBeNull();
    expect(dirty?.getAttribute("aria-hidden")).toBe("true");
  });
});
