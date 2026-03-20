/**
 * Tests for src/layout/components/NavBar/components/UserDropdown.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, nextTick } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
const mockUserStore = { userInfo: null };

vi.mock("@/store", () => ({
  useUserStore: vi.fn(() => mockUserStore),
}));

// ─── Mock router / i18n ───────────────────────────────────────────────────────
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("vue-i18n", () => ({
  useI18n: vi.fn(() => ({ t: (k: string) => k })),
}));

// ─── Mock child components ─────────────────────────────────────────────────────
vi.mock("@/components/Dialog/ConfirmDialog.vue", async () => {
  const { defineComponent: dc } = await import("vue");
  return {
    default: dc({
      name: "ConfirmDialog",
      props: [
        "modelValue",
        "title",
        "message",
        "description",
        "type",
        "confirmText",
        "cancelText",
      ],
      emits: ["confirm", "update:modelValue"],
      template: '<div class="confirm-dialog-stub"></div>',
    }),
  };
});

// ─── Stubs ────────────────────────────────────────────────────────────────────
const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: ["to"],
  template: '<a class="router-link-stub" :href="to"><slot /></a>',
});

const FontAwesomeIconStub = defineComponent({
  name: "FontAwesomeIcon",
  props: ["icon"],
  template: '<i class="fa-icon-stub"></i>',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(userInfo: unknown = null) {
  mockUserStore.userInfo = userInfo as never;
  const { default: UserDropdown } = await import(
    "@/layout/components/NavBar/components/UserDropdown.vue"
  );
  const el = document.createElement("div");
  const app = createApp(UserDropdown as Parameters<typeof createApp>[0]);
  app.component("RouterLink", RouterLinkStub);
  app.component("FontAwesomeIcon", FontAwesomeIconStub);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/NavBar/components/UserDropdown.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .user-profile root element", async () => {
    const { el } = await mount();
    expect(el.querySelector(".user-profile")).not.toBeNull();
  });

  it("renders .profile-trigger button", async () => {
    const { el } = await mount();
    expect(el.querySelector(".profile-trigger")).not.toBeNull();
  });

  it("renders user avatar image with default path when no user info", async () => {
    const { el } = await mount();
    const img = el.querySelector(".user-avatar img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toContain("dicebear.com");
  });

  it("dropdown menu is not shown initially", async () => {
    const { el } = await mount();
    expect(el.querySelector(".dropdown-menu")).toBeNull();
  });

  it("renders confirm-dialog stub", async () => {
    const { el } = await mount();
    expect(el.querySelector(".confirm-dialog-stub")).not.toBeNull();
  });
});
