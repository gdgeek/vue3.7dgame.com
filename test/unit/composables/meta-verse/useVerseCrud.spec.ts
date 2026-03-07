import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (k: string, opts?: Record<string, unknown>) => (opts ? k : k) }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/Dialog", () => ({
  Message: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  MessageBox: { confirm: vi.fn(), prompt: vi.fn() },
}));

vi.mock("@/api/v1/verse", () => ({
  postVerse: vi.fn(),
  putVerse: vi.fn(),
  deleteVerse: vi.fn(),
}));

vi.mock("@/services/scene-package/export-service", () => ({
  exportScene: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useVerseCrud } from "@/views/meta-verse/composables/useVerseCrud";

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

describe("useVerseCrud", () => {
  const opts = {
    refresh: vi.fn(),
    currentVerse: ref(null),
    detailVisible: ref(false),
  };

  it("is a function", () => {
    expect(typeof useVerseCrud).toBe("function");
  });

  it("returns expected properties and handlers", () => {
    const result = mountComposable(() => useVerseCrud(opts));
    expect("importDialogVisible" in result).toBe(true);
    expect("formatItemDate" in result).toBe(true);
    expect("goToEditor" in result).toBe(true);
    expect("createWindow" in result).toBe(true);
    expect("submitCreate" in result).toBe(true);
    expect("handleDelete" in result).toBe(true);
  });

  it("importDialogVisible starts as false", () => {
    const result = mountComposable(() => useVerseCrud(opts));
    expect(result.importDialogVisible.value).toBe(false);
  });

  it("openImportDialog sets importDialogVisible to true", () => {
    const result = mountComposable(() => useVerseCrud(opts));
    result.openImportDialog();
    expect(result.importDialogVisible.value).toBe(true);
  });

  it("formatItemDate returns '—' for undefined input", () => {
    const result = mountComposable(() => useVerseCrud(opts));
    expect(result.formatItemDate(undefined)).toBe("—");
  });

  it("formatItemDate formats a valid date string", () => {
    const result = mountComposable(() => useVerseCrud(opts));
    const formatted = result.formatItemDate("2024-06-15T00:00:00Z");
    expect(formatted).toMatch(/\d{4}\/\d{2}\/\d{2}/);
  });
});
