/**
 * Tests for src/components/Account/Qrcode.vue
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createApp } from "vue";

const mockToCanvas = vi.fn().mockResolvedValue(undefined);
vi.mock("qrcode", () => ({
  default: { toCanvas: mockToCanvas },
}));

vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  mockToCanvas.mockClear();
  vi.resetModules();
});

async function mount(props: Record<string, unknown> = { text: "https://example.com" }) {
  const { default: Qrcode } = await import("@/components/Account/Qrcode.vue");
  const el = document.createElement("div");
  const app = createApp(Qrcode as Parameters<typeof createApp>[0], props);
  app.mount(el);
  cleanups.push(() => app.unmount());
  return { el };
}

describe("Account/Qrcode.vue", () => {
  it("mounts without throwing", async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it("renders qrcode-container div", async () => {
    const { el } = await mount();
    expect(el.querySelector(".qrcode-container")).not.toBeNull();
  });

  it("renders a canvas element", async () => {
    const { el } = await mount();
    expect(el.querySelector("canvas.qrcode-canvas")).not.toBeNull();
  });

  it("calls QRCode.toCanvas on mount", async () => {
    await mount({ text: "https://test.com" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockToCanvas).toHaveBeenCalled();
  });

  it("passes the text prop to QRCode.toCanvas", async () => {
    await mount({ text: "hello-world" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockToCanvas).toHaveBeenCalledWith(
      expect.anything(),
      "hello-world",
      expect.any(Object)
    );
  });

  it("mounts with custom options prop", async () => {
    await expect(
      mount({
        text: "custom",
        options: { width: 200, margin: 2, color: { dark: "#111", light: "#eee" } },
      })
    ).resolves.toBeDefined();
  });
});
