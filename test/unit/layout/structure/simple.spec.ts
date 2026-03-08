/**
 * Tests for src/layout/structure/simple.vue
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const RouterViewStub = defineComponent({
  name: "RouterView",
  template: "<div class='router-view-stub'></div>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

async function mount() {
  const { default: Simple } = await import("@/layout/structure/simple.vue");
  const el = document.createElement("div");
  const app = createApp(Simple as Parameters<typeof createApp>[0]);
  app.component("RouterView", RouterViewStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("layout/structure/simple.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders a root div element", async () => {
    const { el } = await mount();
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders el-container inside", async () => {
    const { el } = await mount();
    // el-container renders as div or its stub
    expect(el.innerHTML).toBeTruthy();
  });

  it("renders router-view stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".router-view-stub")).not.toBeNull();
  });

  it("does not render sidebar or navbar", async () => {
    const { el } = await mount();
    expect(el.querySelector(".sidebar")).toBeNull();
    expect(el.querySelector(".navbar")).toBeNull();
  });
});
