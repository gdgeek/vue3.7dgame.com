/**
 * Tests for src/views/introduce/components/Partner.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp } from "vue";

vi.mock("@/assets/font/font.css", () => ({}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: Partner } = await import(
    "@/views/introduce/components/Partner.vue"
  );
  const el = document.createElement("div");
  const app = createApp(Partner as Parameters<typeof createApp>[0]);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/introduce/components/Partner.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders .partner-background container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".partner-background")).not.toBeNull();
  });

  it("renders partner title heading", async () => {
    const { el } = await mount();
    const h1 = el.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain("合作伙伴");
  });

  it("renders logo-scroll element", async () => {
    const { el } = await mount();
    expect(el.querySelector(".logo-scroll")).not.toBeNull();
  });

  it("renders partner images (at least one img)", async () => {
    const { el } = await mount();
    const imgs = el.querySelectorAll("img");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("renders multiple logo-group elements", async () => {
    const { el } = await mount();
    const groups = el.querySelectorAll(".logo-group");
    expect(groups.length).toBeGreaterThan(1);
  });
});
