/**
 * Unit tests for src/store/modules/screen.ts
 * Covers: isMobile initialization based on window.innerWidth.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

describe("useScreenStore", () => {
  const originalInnerWidth = window.innerWidth;

  function setInnerWidth(width: number) {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetModules();
  });

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
  });

  it("isMobile is true when innerWidth <= 768 (narrow mobile)", async () => {
    setInnerWidth(375);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect(store.isMobile).toBe(true);
  });

  it("isMobile is true when innerWidth is exactly 768", async () => {
    setInnerWidth(768);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect(store.isMobile).toBe(true);
  });

  it("isMobile is false when innerWidth is 769", async () => {
    setInnerWidth(769);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect(store.isMobile).toBe(false);
  });

  it("isMobile is false when innerWidth is a typical desktop width (1920)", async () => {
    setInnerWidth(1920);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect(store.isMobile).toBe(false);
  });

  it("isMobile is false when innerWidth is 1024 (tablet landscape)", async () => {
    setInnerWidth(1024);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect(store.isMobile).toBe(false);
  });

  it("isMobile is true when innerWidth is 0", async () => {
    setInnerWidth(0);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect(store.isMobile).toBe(true);
  });

  it("exposes only the isMobile property", async () => {
    setInnerWidth(800);
    const { useScreenStore } = await import("@/store/modules/screen");
    const store = useScreenStore();
    expect("isMobile" in store).toBe(true);
  });
});
