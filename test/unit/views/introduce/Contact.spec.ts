/**
 * Tests for src/views/introduce/components/Contact.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp } from "vue";

// CSS import mock
vi.mock("@/assets/font/font.css", () => ({}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: Contact } = await import(
    "@/views/introduce/components/Contact.vue"
  );
  const el = document.createElement("div");
  const app = createApp(Contact as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/introduce/components/Contact.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .portal-main-background container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".portal-main-background")).not.toBeNull();
  });

  it("contains phone service text", async () => {
    const { el } = await mount();
    expect(el.textContent).toContain("15000159790");
  });

  it("contains img elements for icons", async () => {
    const { el } = await mount();
    const imgs = el.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("has .content and .content-contact sections", async () => {
    const { el } = await mount();
    expect(el.querySelector(".content")).not.toBeNull();
    expect(el.querySelector(".content-contact")).not.toBeNull();
  });

  it("renders two paragraph elements inside content-contact", async () => {
    const { el } = await mount();
    const ps = el.querySelectorAll(".content-contact p");
    expect(ps.length).toBe(2);
  });
});
