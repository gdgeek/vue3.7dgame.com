/**
 * Tests for src/components/CustomUI/Meteors.vue
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { createApp, nextTick } from "vue";
import Meteors from "@/components/CustomUI/Meteors.vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(props: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  const app = createApp(Meteors, props);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("Meteors.vue", () => {
  it("mounts without throwing", () => {
    expect(() => mount()).not.toThrow();
  });

  it("renders .meteors-wrapper container", () => {
    const { el } = mount();
    expect(el.querySelector(".meteors-wrapper")).not.toBeNull();
  });

  it("renders default 20 meteor spans", () => {
    const { el } = mount();
    const spans = el.querySelectorAll(".meteors-wrapper span");
    expect(spans.length).toBe(20);
  });

  it("renders custom count of meteor spans", () => {
    const { el } = mount({ count: 5 });
    const spans = el.querySelectorAll(".meteors-wrapper span");
    expect(spans.length).toBe(5);
  });

  it("adds resize event listener on mount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    mount();
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    addSpy.mockRestore();
  });

  it("removes resize listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const el = document.createElement("div");
    const app = createApp(Meteors);
    app.mount(el);
    app.unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeSpy.mockRestore();
  });
});
