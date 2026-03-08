import { describe, it, expect, afterEach } from "vitest";
import { createApp, type App } from "vue";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(Component: unknown): { el: HTMLElement; app: App } {
  const el = document.createElement("div");
  const app = createApp(Component as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el, app };
}

describe("views/dashboard/index.vue", () => {
  it("mounts without throwing", async () => {
    const { default: Dashboard } = await import("@/views/dashboard/index.vue");
    expect(() => mount(Dashboard)).not.toThrow();
  });

  it("renders .app-container div", async () => {
    const { default: Dashboard } = await import("@/views/dashboard/index.vue");
    const { el } = mount(Dashboard);
    expect(el.querySelector(".app-container")).not.toBeNull();
  });

  it("contains platform title text", async () => {
    const { default: Dashboard } = await import("@/views/dashboard/index.vue");
    const { el } = mount(Dashboard);
    expect(el.textContent).toContain("Mixed Reality Programming Platform");
  });

  it("renders an h1 element", async () => {
    const { default: Dashboard } = await import("@/views/dashboard/index.vue");
    const { el } = mount(Dashboard);
    expect(el.querySelector("h1")).not.toBeNull();
  });

  it("h1 contains the platform title", async () => {
    const { default: Dashboard } = await import("@/views/dashboard/index.vue");
    const { el } = mount(Dashboard);
    expect(el.querySelector("h1")!.textContent).toContain(
      "Mixed Reality Programming Platform"
    );
  });
});
