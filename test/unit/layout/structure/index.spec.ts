/**
 * Tests for src/layout/structure/index.vue
 * A layout shell that wraps content in el-container > el-main > router-view.
 */
import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const RouterViewStub = defineComponent({
  name: "RouterView",
  template: "<div class='router-view-stub'></div>",
});
const ElContainerStub = defineComponent({
  name: "ElContainer",
  template: "<div class='el-container'><slot /></div>",
});
const ElMainStub = defineComponent({
  name: "ElMain",
  template: "<div class='el-main'><slot /></div>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

async function mount() {
  const { default: Layout } = await import("@/layout/structure/index.vue");
  const el = document.createElement("div");
  const app = createApp(Layout as Parameters<typeof createApp>[0]);
  app.component("RouterView", RouterViewStub);
  app.component("ElContainer", ElContainerStub);
  app.component("ElMain", ElMainStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("layout/structure/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders outer div wrapper", async () => {
    const { el } = await mount();
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders el-container stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-container")).not.toBeNull();
  });

  it("renders el-main stub inside container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-main")).not.toBeNull();
  });

  it("renders router-view stub inside main", async () => {
    const { el } = await mount();
    expect(el.querySelector(".router-view-stub")).not.toBeNull();
  });

  it("can be mounted and unmounted cleanly", async () => {
    const result = await mount();
    expect(result.el).toBeDefined();
  });
});
