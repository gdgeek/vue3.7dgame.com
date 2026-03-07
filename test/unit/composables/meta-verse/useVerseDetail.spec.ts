import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/Dialog", () => ({
  Message: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/api/v1/verse", () => ({
  getVerse: vi.fn(),
  putVerse: vi.fn(),
  addPublic: vi.fn(),
  removePublic: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
}));

vi.mock("@/api/v1/tags", () => ({
  getTags: vi.fn(),
}));

vi.mock("@/utils/utilityFunctions", () => ({
  convertToLocalTime: vi.fn((s: string) => s),
}));

import { useVerseDetail } from "@/views/meta-verse/composables/useVerseDetail";

function mountComposable<T>(fn: () => T): T {
  let result!: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = fn();
        return () => h("div");
      },
    })
  );
  const el = document.createElement("div");
  app.mount(el);
  app.unmount();
  return result;
}

describe("useVerseDetail", () => {
  const opts = {
    refresh: vi.fn(),
    canManage: ref(false),
  };

  it("is a function", () => {
    expect(typeof useVerseDetail).toBe("function");
  });

  it("returns expected reactive properties and handlers", () => {
    const result = mountComposable(() => useVerseDetail(opts));
    expect("detailVisible" in result).toBe(true);
    expect("detailLoading" in result).toBe(true);
    expect("currentVerse" in result).toBe(true);
    expect("openDetail" in result).toBe(true);
    expect("handlePanelClose" in result).toBe(true);
  });

  it("detailVisible starts as false", () => {
    const result = mountComposable(() => useVerseDetail(opts));
    expect(result.detailVisible.value).toBe(false);
  });

  it("detailLoading starts as false", () => {
    const result = mountComposable(() => useVerseDetail(opts));
    expect(result.detailLoading.value).toBe(false);
  });

  it("currentVerse starts as null", () => {
    const result = mountComposable(() => useVerseDetail(opts));
    expect(result.currentVerse.value).toBeNull();
  });

  it("handlePanelClose sets currentVerse to null", () => {
    const result = mountComposable(() => useVerseDetail(opts));
    result.handlePanelClose();
    expect(result.currentVerse.value).toBeNull();
  });
});
