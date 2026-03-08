/**
 * Tests for src/layout/components/Sidebar/components/SidebarMenuItemTitle.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock utils/i18n ──────────────────────────────────────────────────────────
vi.mock("@/utils/i18n", () => ({
  translateRouteTitle: vi.fn((title: string) => `translated:${title}`),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

const SvgIconStub = defineComponent({
  name: "SvgIcon",
  props: ["iconClass"],
  template: '<i class="svg-icon-stub" :data-icon="iconClass"></i>',
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: SidebarMenuItemTitle } = await import(
    "@/layout/components/Sidebar/components/SidebarMenuItemTitle.vue"
  );
  const el = document.createElement("div");
  const app = createApp(SidebarMenuItemTitle as Parameters<typeof createApp>[0], props);
  app.component("svg-icon", SvgIconStub);
  app.component("el-icon", {
    name: "ElIcon",
    template: '<i class="sub-el-icon"><slot /></i>',
  });
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/Sidebar/components/SidebarMenuItemTitle.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders default menu svg-icon stub when no icon provided", async () => {
    const { el } = await mount({ title: "" });
    const icon = el.querySelector(".svg-icon-stub");
    expect(icon).not.toBeNull();
    expect((icon as HTMLElement).dataset.icon).toBe("menu");
  });

  it("renders svg-icon stub when icon is provided (non el-icon)", async () => {
    const { el } = await mount({ icon: "dashboard", title: "" });
    const icon = el.querySelector(".svg-icon-stub");
    expect(icon).not.toBeNull();
    expect((icon as HTMLElement).dataset.icon).toBe("dashboard");
  });

  it("renders span with translated title when title is provided", async () => {
    const { el } = await mount({ icon: "", title: "Home" });
    const span = el.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.textContent).toContain("translated:Home");
  });

  it("does not render span when title is empty", async () => {
    const { el } = await mount({ icon: "", title: "" });
    const span = el.querySelector("span");
    expect(span).toBeNull();
  });

  it("renders el-icon when icon starts with el-icon", async () => {
    const { el } = await mount({ icon: "el-icon-setting", title: "" });
    // Should render el-icon element (not svg-icon stub)
    expect(el.querySelector(".sub-el-icon")).not.toBeNull();
  });
});
