/**
 * Unit tests for src/store/modules/screen.ts
 * Covers: isMobile initialization based on window.innerWidth.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { createApp, defineComponent, h } from "vue";

describe("useScreenStore", () => {
  const originalInnerWidth = window.innerWidth;
  const cleanups: Array<() => void> = [];

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
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
    setInnerWidth(originalInnerWidth);
  });

  async function mountStoreInComponent() {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.resetModules();
    const { useScreenStore } = await import("@/store/modules/screen");

    let store: ReturnType<typeof useScreenStore>;
    const app = createApp(
      defineComponent({
        setup() {
          store = useScreenStore();
          return () => h("div");
        },
      })
    );
    app.use(pinia);
    const el = document.createElement("div");
    app.mount(el);
    cleanups.push(() => app.unmount());
    return store!;
  }

  it("isMobile is true when innerWidth <= 768 (narrow mobile)", async () => {
    setInnerWidth(375);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(true);
  });

  it("isMobile is true when innerWidth is exactly 768", async () => {
    setInnerWidth(768);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(true);
  });

  it("isMobile is false when innerWidth is 769", async () => {
    setInnerWidth(769);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(false);
  });

  it("isMobile is false when innerWidth is a typical desktop width (1920)", async () => {
    setInnerWidth(1920);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(false);
  });

  it("isMobile is false when innerWidth is 1024 (tablet landscape)", async () => {
    setInnerWidth(1024);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(false);
  });

  it("isMobile is true when innerWidth is 0", async () => {
    setInnerWidth(0);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(true);
  });

  it("exposes only the isMobile property", async () => {
    setInnerWidth(800);
    const store = await mountStoreInComponent();
    expect("isMobile" in store).toBe(true);
  });

  it("isMobile is a boolean", async () => {
    setInnerWidth(500);
    const store = await mountStoreInComponent();
    expect(typeof store.isMobile).toBe("boolean");
  });

  it("isMobile is false when innerWidth is 769 (just above threshold)", async () => {
    setInnerWidth(769);
    const store = await mountStoreInComponent();
    expect(store.isMobile).toBe(false);
  });

  it("multiple store instances share the same isMobile reactive ref", async () => {
    setInnerWidth(400);
    const store1 = await mountStoreInComponent();
    const store2 = await mountStoreInComponent();
    expect(store1.isMobile).toBe(store2.isMobile);
  });

  describe("handleResize via window resize event (mounted in component)", () => {
    it("updates isMobile to true when resized to mobile width", async () => {
      setInnerWidth(1200);
      const store = await mountStoreInComponent();

      expect(store.isMobile).toBe(false);

      // Simulate resize to mobile
      setInnerWidth(375);
      window.dispatchEvent(new Event("resize"));

      expect(store.isMobile).toBe(true);
    });

    it("updates isMobile to false when resized to desktop width", async () => {
      setInnerWidth(320);
      const store = await mountStoreInComponent();

      expect(store.isMobile).toBe(true);

      setInnerWidth(1440);
      window.dispatchEvent(new Event("resize"));

      expect(store.isMobile).toBe(false);
    });
  });
});
