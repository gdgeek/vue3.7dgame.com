/**
 * Tests for src/layout/components/NavBar/components/NavbarRight.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
const mockAppStore = { device: "desktop" };
const mockUserStore = { userInfo: null };
const mockSettingsStore = { settingsVisible: false };
const mockDomainStore = { isLanguageLocked: false };

vi.mock("@/store", () => ({
  useAppStore: vi.fn(() => mockAppStore),
  useUserStore: vi.fn(() => mockUserStore),
  useSettingsStore: vi.fn(() => mockSettingsStore),
}));

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => mockDomainStore),
}));

vi.mock("@/settings", () => ({
  default: { showSettings: true },
}));

vi.mock("@/enums/DeviceEnum", () => ({
  DeviceEnum: { MOBILE: "mobile", DESKTOP: "desktop" },
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

// ─── Mock vue-router / vue-i18n ───────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useRoute: vi.fn(() => ({ path: "/", query: {}, meta: {} })),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

// ─── Mock VueUse ─────────────────────────────────────────────────────────────
vi.mock("@vueuse/core", () => ({
  useFullscreen: vi.fn(() => ({ isFullscreen: { value: false }, toggle: vi.fn() })),
}));

// ─── Stubs ────────────────────────────────────────────────────────────────────
const SvgIconStub = defineComponent({
  name: "SvgIcon",
  props: ["iconClass"],
  template: '<i class="svg-icon-stub" :data-icon="iconClass"></i>',
});

const LangSelectStub = defineComponent({
  name: "LangSelect",
  template: '<div class="lang-select-stub"></div>',
});

const ElDropdownStub = defineComponent({
  name: "ElDropdown",
  props: ["trigger"],
  template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>',
});

const ElDropdownMenuStub = defineComponent({
  name: "ElDropdownMenu",
  template: '<ul class="el-dropdown-menu-stub"><slot /></ul>',
});

const ElDropdownItemStub = defineComponent({
  name: "ElDropdownItem",
  props: ["divided"],
  template: '<li class="el-dropdown-item-stub"><slot /></li>',
});

const ElAvatarStub = defineComponent({
  name: "ElAvatar",
  props: ["shape", "size", "src"],
  template: '<span class="el-avatar-stub"></span>',
});

const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: ["to"],
  template: '<a class="router-link-stub"><slot /></a>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: NavbarRight } = await import(
    "@/layout/components/NavBar/components/NavbarRight.vue"
  );
  const el = document.createElement("div");
  const app = createApp(NavbarRight as Parameters<typeof createApp>[0]);
  // Provide $t as global property so template can call $t(...)
  app.config.globalProperties.$t = (k: string) => k;
  app.component("svg-icon", SvgIconStub);
  app.component("lang-select", LangSelectStub);
  app.component("el-dropdown", ElDropdownStub);
  app.component("el-dropdown-menu", ElDropdownMenuStub);
  app.component("el-dropdown-item", ElDropdownItemStub);
  app.component("el-avatar", ElAvatarStub);
  app.component("RouterLink", RouterLinkStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/NavBar/components/NavbarRight.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders flex container", async () => {
    const { el } = await mount();
    const root = el.querySelector(".flex");
    expect(root).not.toBeNull();
  });

  it("renders el-dropdown for user menu", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-dropdown-stub")).not.toBeNull();
  });

  it("renders lang-select when isLanguageLocked is false", async () => {
    const { el } = await mount();
    expect(el.querySelector(".lang-select-stub")).not.toBeNull();
  });

  it("renders fullscreen svg-icon", async () => {
    const { el } = await mount();
    const icons = el.querySelectorAll(".svg-icon-stub");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders user avatar element", async () => {
    const { el } = await mount();
    expect(el.querySelector(".el-avatar-stub")).not.toBeNull();
  });
});
