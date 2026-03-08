/**
 * Tests for simple shell views that just render a router-view wrapper.
 * Covers:
 *   - src/layout/empty/index.vue
 *   - src/views/settings/orderform.vue
 *   - src/views/settings/pay.vue
 *   - src/views/settings/people.vue
 *   - src/views/settings/user.vue
 *   - src/views/dashboard/index.vue
 *   - src/components/TransitionWrapper.vue
 *   - src/layout/structure/simple.vue
 */
import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, createApp, type App } from "vue";

// Stub out router-view so mounts don't fail
const RouterViewStub = defineComponent({
  name: "RouterView",
  template: "<div class='router-view-stub'></div>",
});

// Stub Element Plus components
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

function mountComponent(Component: unknown): { el: HTMLElement; app: App } {
  const el = document.createElement("div");
  const app = createApp(Component as Parameters<typeof createApp>[0]);
  app.component("RouterView", RouterViewStub);
  app.component("ElContainer", ElContainerStub);
  app.component("ElMain", ElMainStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el, app };
}

// ─── layout/empty/index.vue ──────────────────────────────────────────────────
describe("layout/empty/index.vue", () => {
  it("mounts without throwing", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    expect(() => mountComponent(Layout)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    const { el } = mountComponent(Layout);
    expect(el.querySelector("section")).not.toBeNull();
  });

  it("contains a router-view stub", async () => {
    const { default: Layout } = await import("@/layout/empty/index.vue");
    const { el } = mountComponent(Layout);
    expect(el.querySelector(".router-view-stub")).not.toBeNull();
  });
});

// ─── settings/orderform.vue ──────────────────────────────────────────────────
describe("settings/orderform.vue", () => {
  it("mounts without throwing", async () => {
    const { default: View } = await import(
      "@/views/settings/orderform.vue"
    );
    expect(() => mountComponent(View)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: View } = await import(
      "@/views/settings/orderform.vue"
    );
    const { el } = mountComponent(View);
    expect(el.querySelector("section")).not.toBeNull();
  });
});

// ─── settings/pay.vue ────────────────────────────────────────────────────────
describe("settings/pay.vue", () => {
  it("mounts without throwing", async () => {
    const { default: View } = await import("@/views/settings/pay.vue");
    expect(() => mountComponent(View)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: View } = await import("@/views/settings/pay.vue");
    const { el } = mountComponent(View);
    expect(el.querySelector("section")).not.toBeNull();
  });
});

// ─── settings/people.vue ─────────────────────────────────────────────────────
describe("settings/people.vue", () => {
  it("mounts without throwing", async () => {
    const { default: View } = await import(
      "@/views/settings/people.vue"
    );
    expect(() => mountComponent(View)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: View } = await import(
      "@/views/settings/people.vue"
    );
    const { el } = mountComponent(View);
    expect(el.querySelector("section")).not.toBeNull();
  });
});

// ─── settings/user.vue ───────────────────────────────────────────────────────
describe("settings/user.vue", () => {
  it("mounts without throwing", async () => {
    const { default: View } = await import("@/views/settings/user.vue");
    expect(() => mountComponent(View)).not.toThrow();
  });

  it("renders a section element", async () => {
    const { default: View } = await import("@/views/settings/user.vue");
    const { el } = mountComponent(View);
    expect(el.querySelector("section")).not.toBeNull();
  });
});

// ─── dashboard/index.vue ─────────────────────────────────────────────────────
describe("dashboard/index.vue", () => {
  it("mounts without throwing", async () => {
    const { default: Dashboard } = await import(
      "@/views/dashboard/index.vue"
    );
    expect(() => mountComponent(Dashboard)).not.toThrow();
  });

  it("renders the main container div", async () => {
    const { default: Dashboard } = await import(
      "@/views/dashboard/index.vue"
    );
    const { el } = mountComponent(Dashboard);
    expect(el.querySelector(".app-container")).not.toBeNull();
  });

  it("contains the platform title text", async () => {
    const { default: Dashboard } = await import(
      "@/views/dashboard/index.vue"
    );
    const { el } = mountComponent(Dashboard);
    expect(el.textContent).toContain("Mixed Reality Programming Platform");
  });
});

// ─── TransitionWrapper.vue ───────────────────────────────────────────────────
describe("TransitionWrapper.vue", () => {
  it("mounts without throwing", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    expect(() => mountComponent(TransitionWrapper)).not.toThrow();
  });

  it("renders a div wrapper", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    const { el } = mountComponent(TransitionWrapper);
    expect(el.querySelector("div")).not.toBeNull();
  });

  it("renders slot content", async () => {
    const { default: TransitionWrapper } = await import(
      "@/components/TransitionWrapper.vue"
    );
    const el = document.createElement("div");
    const Wrapper = defineComponent({
      components: { TransitionWrapper },
      template:
        "<TransitionWrapper><span class='slot-content'>hello</span></TransitionWrapper>",
    });
    const app = createApp(Wrapper);
    app.mount(el);
    cleanups.push(() => app.unmount());
    expect(el.querySelector(".slot-content")).not.toBeNull();
    expect(el.querySelector(".slot-content")!.textContent).toBe("hello");
  });
});

// ─── layout/structure/simple.vue ─────────────────────────────────────────────
describe("layout/structure/simple.vue", () => {
  it("mounts without throwing", async () => {
    const { default: SimpleLayout } = await import(
      "@/layout/structure/simple.vue"
    );
    expect(() => mountComponent(SimpleLayout)).not.toThrow();
  });

  it("renders a div wrapper", async () => {
    const { default: SimpleLayout } = await import(
      "@/layout/structure/simple.vue"
    );
    const { el } = mountComponent(SimpleLayout);
    expect(el.querySelector("div")).not.toBeNull();
  });
});
