/**
 * Unit tests for src/composables/useAOS.ts
 *
 * Verifies that AOS.init() is called with the correct options when a
 * component mounts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp, defineComponent, h } from "vue";

const mockInit = vi.hoisted(() => vi.fn());

vi.mock("aos", () => ({
  default: { init: mockInit },
}));
vi.mock("aos/dist/aos.css", () => ({}));

import { useAOS } from "@/composables/useAOS";

function mountWithAOS(fn: () => void): () => void {
  const app = createApp(
    defineComponent({
      setup() {
        fn();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  return () => app.unmount();
}

describe("useAOS()", () => {
  beforeEach(() => {
    mockInit.mockClear();
  });

  it("calls AOS.init() on mount with default options", () => {
    const unmount = mountWithAOS(() => useAOS());
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith({
      duration: 1000,
      once: false,
      mirror: true,
    });
    unmount();
  });

  it("merges custom duration into default options", () => {
    const unmount = mountWithAOS(() => useAOS({ duration: 800 }));
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 800 })
    );
    unmount();
  });

  it("merges once: true into default options", () => {
    const unmount = mountWithAOS(() => useAOS({ once: true }));
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ once: true })
    );
    unmount();
  });

  it("overrides mirror when explicitly set to false", () => {
    const unmount = mountWithAOS(() => useAOS({ mirror: false }));
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ mirror: false })
    );
    unmount();
  });

  it("passes fully custom options object", () => {
    const custom = { duration: 500, once: true, mirror: false };
    const unmount = mountWithAOS(() => useAOS(custom));
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining(custom));
    unmount();
  });

  it("does not call AOS.init() before mount", () => {
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("empty options object still uses defaults for unspecified fields", () => {
    const unmount = mountWithAOS(() => useAOS({}));
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 1000, once: false, mirror: true })
    );
    unmount();
  });

  it("calling useAOS twice mounts two components each calling AOS.init once", () => {
    const u1 = mountWithAOS(() => useAOS());
    const u2 = mountWithAOS(() => useAOS({ duration: 500 }));
    expect(mockInit).toHaveBeenCalledTimes(2);
    u1();
    u2();
  });

  it("additional AOS option (easing) is passed through to AOS.init", () => {
    const unmount = mountWithAOS(() =>
      useAOS({ easing: "ease-in-out" } as any)
    );
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({ easing: "ease-in-out" })
    );
    unmount();
  });

  it("AOS.init() is called with all three default properties", () => {
    const unmount = mountWithAOS(() => useAOS());
    const callArg = mockInit.mock.calls[0][0];
    expect("duration" in callArg).toBe(true);
    expect("once" in callArg).toBe(true);
    expect("mirror" in callArg).toBe(true);
    unmount();
  });

  it("AOS.init call count does not exceed 1 for a single mount", () => {
    const unmount = mountWithAOS(() => useAOS());
    expect(mockInit).toHaveBeenCalledTimes(1);
    unmount();
  });
});
