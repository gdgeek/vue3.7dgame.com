/**
 * Tests for src/views/web/components/Bilibili.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp, nextTick } from "vue";
import Bilibili from "@/views/web/components/Bilibili.vue";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

function mount(props: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  const app = createApp(Bilibili, props);
  // el-card stub
  app.component("el-card", {
    name: "ElCard",
    props: ["style"],
    template: '<div class="el-card-stub"><slot /></div>',
  });
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Bilibili.vue", () => {
  it("mounts without throwing", () => {
    expect(() => mount()).not.toThrow();
  });

  it("renders .bilibili-player-container", () => {
    const { el } = mount();
    expect(el.querySelector(".bilibili-player-container")).not.toBeNull();
  });

  it("renders an iframe element", () => {
    const { el } = mount({ bvid: "BV1j2dPYWEh1" });
    const iframe = el.querySelector("iframe.bilibili-player");
    expect(iframe).not.toBeNull();
  });

  it("iframe src includes bvid when BV number provided", () => {
    const { el } = mount({ bvid: "BV1j2dPYWEh1" });
    const iframe = el.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("bvid=BV1j2dPYWEh1");
  });

  it("iframe src includes aid when aid provided (no bvid)", () => {
    const { el } = mount({ aid: "12345" });
    const iframe = el.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("aid=12345");
  });

  it("autoplay param is 0 by default", () => {
    const { el } = mount({ bvid: "BV1test" });
    const iframe = el.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("autoplay=0");
  });

  it("autoplay param is 1 when autoplay=true", () => {
    const { el } = mount({ bvid: "BV1test", autoplay: true });
    const iframe = el.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("autoplay=1");
  });
});
