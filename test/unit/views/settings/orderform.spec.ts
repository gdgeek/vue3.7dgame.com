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

describe("views/settings/orderform.vue", () => {
  it("mounts without throwing", async () => {
    const { default: View } = await import("@/views/settings/orderform.vue");
    expect(() => mount(View)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: View } = await import("@/views/settings/orderform.vue");
    const { el } = mount(View);
    expect(el.querySelector("section")).not.toBeNull();
  });

  it("contains router-view inside section", async () => {
    const { default: View } = await import("@/views/settings/orderform.vue");
    const { el } = mount(View);
    expect(el.querySelector("section .router-view-stub")).not.toBeNull();
  });

  it("renders exactly one section", async () => {
    const { default: View } = await import("@/views/settings/orderform.vue");
    const { el } = mount(View);
    expect(el.querySelectorAll("section").length).toBe(1);
  });
});
