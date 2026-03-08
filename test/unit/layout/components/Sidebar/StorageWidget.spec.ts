/**
 * Tests for src/layout/components/Sidebar/StorageWidget.vue
 * Pure computed component — no external mocks needed.
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp } from "vue";
import StorageWidget from "@/layout/components/Sidebar/StorageWidget.vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount() {
  const el = document.createElement("div");
  const app = createApp(StorageWidget);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("layout/components/Sidebar/StorageWidget.vue", () => {
  it("mounts without throwing", () => {
    expect(() => mount()).not.toThrow();
  });

  it("renders .storage-widget container", () => {
    const { el } = mount();
    expect(el.querySelector(".storage-widget")).not.toBeNull();
  });

  it("displays usage percentage (default 7.5/10 GB = 75%)", () => {
    const { el } = mount();
    const percent = el.querySelector(".storage-percent");
    expect(percent?.textContent?.trim()).toBe("75%");
  });

  it("displays used storage formatted as GB", () => {
    const { el } = mount();
    expect(el.textContent).toContain("7.5GB");
  });

  it("displays total storage as 10.0GB", () => {
    const { el } = mount();
    expect(el.textContent).toContain("10.0GB");
  });

  it("renders the .storage-bar element", () => {
    const { el } = mount();
    expect(el.querySelector(".storage-bar")).not.toBeNull();
  });

  it("storage-bar-fill width reflects usage percent", () => {
    const { el } = mount();
    const fill = el.querySelector<HTMLElement>(".storage-bar-fill");
    expect(fill?.style.width).toBe("75%");
  });
});
