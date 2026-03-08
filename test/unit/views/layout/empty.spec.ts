import { describe, it, expect, afterEach } from "vitest";
import { createApp, defineComponent, type App } from "vue";

const RouterViewStub = defineComponent({
  name: "RouterView",
  template: "<div class='router-view-stub'></div>",
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(Component: unknown): { el: HTMLElement; app: App } {
  const el = document.createElement("div");
  const app = createApp(Component as Parameters<typeof createApp>[0]);
  app.component("RouterView", RouterViewStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el, app };
}

describe("layout/empty/index.vue", () => {
  it("mounts without throwing", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    expect(() => mount(Layout)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    const { el } = mount(Layout);
    expect(el.querySelector("section")).not.toBeNull();
  });

  it("contains a router-view stub inside the section", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    const { el } = mount(Layout);
    expect(el.querySelector("section .router-view-stub")).not.toBeNull();
  });

  it("renders exactly one section element", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    const { el } = mount(Layout);
    expect(el.querySelectorAll("section").length).toBe(1);
  });
});
