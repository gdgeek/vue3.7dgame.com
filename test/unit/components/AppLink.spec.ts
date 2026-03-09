/**
 * Tests for src/components/AppLink/index.vue
 * Tests the computed logic: external URLs → <a> tag, internal → router-link.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, createApp, type App } from "vue";

vi.mock("@/utils/index", () => ({
  isExternal: (path: string) => path.startsWith("http"),
}));

// Router-link stub that exposes the `to` prop
const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: { to: { type: [String, Object], default: "" } },
  template:
    '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>',
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

type MountOpts = { to: Record<string, unknown> };

function mountAppLink(opts: MountOpts): { el: HTMLElement; app: App } {
  const el = document.createElement("div");
  // Dynamic import resolves from module cache in Vitest
  // We'll use a synchronous approach here with a wrapper
  return { el, app: {} as App };
}

describe("AppLink", () => {
  async function mount(
    opts: MountOpts
  ): Promise<{ el: HTMLElement; app: App }> {
    const { default: AppLink } = await import("@/components/AppLink/index.vue");
    const el = document.createElement("div");
    const app = createApp(AppLink, { to: opts.to });
    app.component("RouterLink", RouterLinkStub);
    app.mount(el);
    cleanups.push(() => app.unmount());
    return { el, app };
  }

  it("mounts without throwing for external URL", async () => {
    await expect(
      mount({ to: { path: "http://example.com" } })
    ).resolves.not.toThrow();
  });

  it("renders an <a> tag for external URL", async () => {
    const { el } = await mount({ to: { path: "http://example.com" } });
    const a = el.querySelector("a");
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe("http://example.com");
  });

  it("sets target=_blank for external URL", async () => {
    const { el } = await mount({ to: { path: "http://example.com" } });
    const a = el.querySelector("a");
    expect(a!.getAttribute("target")).toBe("_blank");
  });

  it("sets rel=noopener noreferrer for external URL", async () => {
    const { el } = await mount({ to: { path: "http://example.com" } });
    const a = el.querySelector("a");
    expect(a!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders a router-link stub for internal URL", async () => {
    const { el } = await mount({ to: { path: "/some/path" } });
    expect(el.querySelector(".router-link-stub")).not.toBeNull();
  });

  it("passes `to` prop to router-link for internal URL", async () => {
    const to = { path: "/some/path" };
    const { el } = await mount({ to });
    const link = el.querySelector(".router-link-stub");
    const dataTo = JSON.parse(link!.getAttribute("data-to") ?? "{}");
    expect(dataTo.path).toBe("/some/path");
  });

  it("renders slot content for external URL", async () => {
    const { default: AppLink } = await import("@/components/AppLink/index.vue");
    const el = document.createElement("div");
    const Wrapper = defineComponent({
      components: { AppLink, RouterLink: RouterLinkStub },
      template:
        '<AppLink :to="{ path: \'http://ext.com\' }"><span class="child">link text</span></AppLink>',
    });
    const app = createApp(Wrapper);
    app.component("RouterLink", RouterLinkStub);
    app.mount(el);
    cleanups.push(() => app.unmount());
    expect(el.querySelector(".child")).not.toBeNull();
    expect(el.querySelector(".child")!.textContent).toBe("link text");
  });

  it("renders slot content for internal URL", async () => {
    const { default: AppLink } = await import("@/components/AppLink/index.vue");
    const el = document.createElement("div");
    const Wrapper = defineComponent({
      components: { AppLink, RouterLink: RouterLinkStub },
      template:
        '<AppLink :to="{ path: \'/home\' }"><span class="inner">inner</span></AppLink>',
    });
    const app = createApp(Wrapper);
    app.component("RouterLink", RouterLinkStub);
    app.mount(el);
    cleanups.push(() => app.unmount());
    expect(el.querySelector(".inner")).not.toBeNull();
  });

  it("mounts without throwing for internal URL", async () => {
    await expect(mount({ to: { path: "/dashboard" } })).resolves.not.toThrow();
  });
});
