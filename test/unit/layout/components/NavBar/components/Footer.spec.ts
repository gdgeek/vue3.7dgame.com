/**
 * Tests for src/layout/components/NavBar/components/Footer.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";

// ─── Mock stores ───────────────────────────────────────────────────────────────
const mockDomainStore = {
  links: [
    { url: "https://example.com", name: "Example" },
    { url: "https://other.com", name: "Other" },
  ],
};
const mockSettingsStore = { theme: "light" };

vi.mock("@/store/modules/domain", () => ({
  useDomainStore: vi.fn(() => mockDomainStore),
}));

vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: vi.fn(() => mockSettingsStore),
}));

vi.mock("@/enums/ThemeEnum", () => ({
  ThemeEnum: { DARK: "dark", LIGHT: "light" },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: Footer } = await import(
    "@/layout/components/NavBar/components/Footer.vue"
  );
  const el = document.createElement("div");
  const app = createApp(Footer as Parameters<typeof createApp>[0], props);
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("layout/components/NavBar/components/Footer.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders footer.app-footer element", async () => {
    const { el } = await mount();
    expect(el.querySelector("footer.app-footer")).not.toBeNull();
  });

  it("renders .footer-links container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".footer-links")).not.toBeNull();
  });

  it("renders footer links from domainStore", async () => {
    const { el } = await mount();
    const links = el.querySelectorAll(".footer-link");
    expect(links.length).toBe(2);
    expect(links[0].textContent?.trim()).toBe("Example");
  });

  it("renders .footer-version element", async () => {
    const { el } = await mount();
    const version = el.querySelector(".footer-version");
    expect(version).not.toBeNull();
    expect(version!.textContent).toContain("版本");
  });

  it("does not have dark-mode class when theme is light", async () => {
    const { el } = await mount();
    const footer = el.querySelector("footer.app-footer");
    expect(footer!.classList.contains("dark-mode")).toBe(false);
  });
});
