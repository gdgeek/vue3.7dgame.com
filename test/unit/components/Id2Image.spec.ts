/**
 * Tests for src/components/Id2Image.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp } from "vue";

vi.mock("@/utils/helper", () => ({
  toHttps: (url: string | null | undefined) => url || null,
}));

vi.mock("vue-waterfall-plugin-next", () => ({
  LazyImg: {
    name: "LazyImg",
    props: ["url", "fit"],
    template: "<img class='lazy-img-stub' />",
  },
}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = {}) {
  const { default: Id2Image } = await import("@/components/Id2Image.vue");
  const el = document.createElement("div");
  const app = createApp(Id2Image as Parameters<typeof createApp>[0], props);
  app.component("el-image", {
    name: "ElImage",
    props: ["src", "fit"],
    template: "<img class='el-image-stub' :src='src' />",
  });
  app.directive("loading", {
    mounted: () => undefined,
    updated: () => undefined,
    unmounted: () => undefined,
  });
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("Id2Image.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders image-wrapper div", async () => {
    const { el } = await mount();
    expect(el.querySelector(".image-wrapper")).not.toBeNull();
  });

  it("uses lazy mode (LazyImg stub) by default", async () => {
    const { el } = await mount({ id: 5 });
    expect(el.querySelector(".lazy-img-stub")).not.toBeNull();
  });

  it("uses el-image when lazy=false", async () => {
    const { el } = await mount({ id: 5, lazy: false });
    // el-image renders as <img> when lazy is disabled
    expect(el.querySelector(".lazy-img-stub")).toBeNull();
  });

  it("mounts with explicit image URL", async () => {
    const { el } = await mount({ image: "https://example.com/img.png", lazy: false });
    expect(el.querySelector(".image-wrapper")).not.toBeNull();
  });

  it("mounts with myqcloud.com image URL (thumbnail processing)", async () => {
    await expect(
      mount({ image: "https://bucket.myqcloud.com/photo.jpg", lazy: false })
    ).resolves.toBeDefined();
  });
});
