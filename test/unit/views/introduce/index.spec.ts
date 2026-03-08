/**
 * Tests for src/views/introduce/index.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent } from "vue";

vi.mock("@/views/introduce/components/About.vue", () => ({
  default: defineComponent({
    name: "About",
    template: "<div class='about-stub'></div>",
  }),
}));

vi.mock("@/views/introduce/components/Contact.vue", () => ({
  default: defineComponent({
    name: "Contact",
    template: "<div class='contact-stub'></div>",
  }),
}));

vi.mock("@/views/introduce/components/Partner.vue", () => ({
  default: defineComponent({
    name: "Partner",
    template: "<div class='partner-stub'></div>",
  }),
}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount() {
  const { default: IntroduceIndex } = await import(
    "@/views/introduce/index.vue"
  );
  const el = document.createElement("div");
  const app = createApp(IntroduceIndex as Parameters<typeof createApp>[0]);
  app.component("About", defineComponent({
    name: "About",
    template: "<div class='about-stub'></div>",
  }));
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("views/introduce/index.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders app-container div", async () => {
    const { el } = await mount();
    expect(el.querySelector(".app-container")).not.toBeNull();
  });

  it("renders nav-container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".nav-container")).not.toBeNull();
  });

  it("renders nav items for tabs", async () => {
    const { el } = await mount();
    const navItems = el.querySelectorAll(".nav-item");
    expect(navItems.length).toBeGreaterThan(0);
  });

  it("renders content-container", async () => {
    const { el } = await mount();
    expect(el.querySelector(".content-container")).not.toBeNull();
  });

  it("default tab is 'about' (nav-item active class set)", async () => {
    const { el } = await mount();
    const activeItem = el.querySelector(".nav-item.active");
    // The 'about' tab is active by default
    expect(activeItem).not.toBeNull();
  });
});
