/**
 * Unit tests for src/utils/nprogress.ts
 * Verifies that NProgress is configured and exported correctly.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("nprogress/nprogress.css", () => ({}));

vi.mock("nprogress", () => {
  const configure = vi.fn();
  const start = vi.fn();
  const done = vi.fn();
  const inc = vi.fn();
  return { default: { configure, start, done, inc } };
});

describe("nprogress util", () => {
  it("exports a NProgress object with start and done methods", async () => {
    const { default: NProgress } = await import("@/utils/nprogress");
    expect(typeof NProgress.start).toBe("function");
    expect(typeof NProgress.done).toBe("function");
  });

  it("calls NProgress.configure with expected options", async () => {
    const nprogress = await import("nprogress");
    const NProgress = nprogress.default as { configure: ReturnType<typeof vi.fn> };
    expect(NProgress.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        easing: "ease",
        speed: 500,
        showSpinner: false,
        trickleSpeed: 200,
        minimum: 0.3,
      })
    );
  });
});
