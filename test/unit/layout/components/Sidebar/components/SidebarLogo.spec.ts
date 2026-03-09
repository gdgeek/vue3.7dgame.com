/**
 * Tests for src/layout/components/Sidebar/components/SidebarLogo.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
const mockSettingsStore = { sidebarLogo: true, theme: "light" };
const mockDomainStore = {
  title: "TestApp",
  icon: "https://example.com/icon.png",
};

vi.mock("@/store", () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => mockDomainStore),
}));

// ─── Stubs ────────────────────────────────────────────────────────────────────
const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: ["to"],
  template: '<a class="router-link-stub" :href="to"><slot /></a>',
});

const ElTooltipStub = defineComponent({
  name: "ElTooltip",
  props: ["content", "placement", "showAfter"],
  template: '<div class="el-tooltip-stub"><slot /></div>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: SidebarLogo } = await import(
    "@/layout/components/Sidebar/components/SidebarLogo.vue"
  );
  const el = document.createElement("div");
  const app = createApp(SidebarLogo as Parameters<typeof createApp>[0], {
    collapse: false,
    ...props,
  });
  app.component("RouterLink", RouterLinkStub);
  app.component("ElTooltip", ElTooltipStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/Sidebar/components/SidebarLogo.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .logo-container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".logo-container")).not.toBeNull();
  });

  it("renders router-link to /", async () => {
    const { el } = await mount();
    const link = el.querySelector(".router-link-stub");
    expect(link).not.toBeNull();
  });

  it("renders logo image when sidebarLogo is true", async () => {
    const { el } = await mount();
    const img = el.querySelector("img.logo-image");
    expect(img).not.toBeNull();
  });

  it("renders domain title in logo-title span", async () => {
    const { el } = await mount({ collapse: false });
    const span = el.querySelector(".logo-title");
    expect(span).not.toBeNull();
    expect(span!.textContent?.trim()).toBe("TestApp");
  });

  it("does not render logo-title in collapsed mode", async () => {
    const { el } = await mount({ collapse: true });
    expect(el.querySelector(".logo-title")).toBeNull();
  });
});
