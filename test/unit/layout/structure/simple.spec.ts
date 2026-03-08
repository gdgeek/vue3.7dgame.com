import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

const ElContainerStub = defineComponent({
  name: "ElContainer",
  template: "<div class='el-container-stub'><slot /></div>",
});

const ElMainStub = defineComponent({
  name: "ElMain",
  template: "<main class='el-main-stub'><slot /></main>",
});

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
  const Comp = (await import("@/layout/structure/simple.vue")).default;
  const el = document.createElement("div");
  const app = createApp(Comp as Parameters<typeof createApp>[0]);
  app.component("ElContainer", ElContainerStub);
  app.component("ElMain", ElMainStub);
  app.component("RouterView", RouterViewStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("layout/structure/simple.vue", () => {
  it("mounts successfully", async () => {
    const { el } = await mount();
    expect(el).toBeDefined();
  });

  it("renders outer wrapper div", async () => {
    const { el } = await mount();
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders el-container and el-main", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-container-stub")).not.toBeNull();
    expect(el.querySelector(".el-main-stub")).not.toBeNull();
  });

  it("renders router-view inside main section", async () => {
    const { el } = await mount();
    const main = el.querySelector(".el-main-stub");
    expect(main?.querySelector(".router-view-stub")).not.toBeNull();
  });

  it("has exactly one router-view", async () => {
    const { el } = await mount();
    expect(el.querySelectorAll(".router-view-stub")).toHaveLength(1);
  });
});
