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

  it("exports inc method", async () => {
    const { default: NProgress } = await import("@/utils/nprogress");
    expect(typeof NProgress.inc).toBe("function");
  });

  it("showSpinner is explicitly false (no spinner icon)", async () => {
    const nprogress = await import("nprogress");
    const NProgress = nprogress.default as { configure: ReturnType<typeof vi.fn> };
    const configArg = NProgress.configure.mock.calls[0][0] as Record<string, unknown>;
    expect(configArg.showSpinner).toBe(false);
  });

  it("minimum is 0.3 (starts at 30% not 0%)", async () => {
    const nprogress = await import("nprogress");
    const NProgress = nprogress.default as { configure: ReturnType<typeof vi.fn> };
    const configArg = NProgress.configure.mock.calls[0][0] as Record<string, unknown>;
    expect(configArg.minimum).toBe(0.3);
  });

  it("configure is called exactly once on module load", async () => {
    const nprogress = await import("nprogress");
    const NProgress = nprogress.default as { configure: ReturnType<typeof vi.fn> };
    // configure should have been called once when the module was imported
    expect(NProgress.configure).toHaveBeenCalledTimes(1);
  });
});
