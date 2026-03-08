/**
 * Tests for src/components/Script.vue
 * A minimal placeholder component that renders an empty div.
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp } from "vue";
import Script from "@/components/Script.vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount() {
  const el = document.createElement("div");
  const app = createApp(Script);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("components/Script.vue", () => {
  it("mounts without throwing", () => {
    expect(() => mount()).not.toThrow();
  });

  it("renders a div element", () => {
    const { el } = mount();
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders an empty div (no text content)", () => {
    const { el } = mount();
    expect(el.querySelector("div")!.textContent).toBe("");
  });

  it("can be mounted and unmounted multiple times", () => {
    for (let i = 0; i < 3; i++) {
      expect(() => mount()).not.toThrow();
    }
  });
});
