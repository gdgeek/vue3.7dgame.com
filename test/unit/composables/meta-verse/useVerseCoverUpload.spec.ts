import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/Dialog", () => ({
  Message: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/api/v1/verse", () => ({
  putVerse: vi.fn(),
}));

vi.mock("@/api/v1/resources/index", () => ({
  getPicture: vi.fn(),
}));

vi.mock("@/api/v1/files", () => ({
  postFile: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      fileMD5: vi.fn(),
      publicHandler: vi.fn(),
      fileHas: vi.fn(),
      fileUpload: vi.fn(),
      fileUrl: vi.fn(),
    },
  }),
}));

import { useVerseCoverUpload } from "@/views/meta-verse/composables/useVerseCoverUpload";

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

describe("useVerseCoverUpload", () => {
  const opts = {
    currentVerse: ref(null),
    detailLoading: ref(false),
    openDetail: vi.fn(),
  };

  it("is a function", () => {
    expect(typeof useVerseCoverUpload).toBe("function");
  });

  it("returns expected properties and handlers", () => {
    const result = mountComposable(() => useVerseCoverUpload(opts));
    expect("imageSelectDialogVisible" in result).toBe(true);
    expect("triggerFileSelect" in result).toBe(true);
    expect("openLocalUpload" in result).toBe(true);
    expect("openResourceDialog" in result).toBe(true);
    expect("handleCoverUpload" in result).toBe(true);
  });

  it("imageSelectDialogVisible starts as false", () => {
    const result = mountComposable(() => useVerseCoverUpload(opts));
    expect(result.imageSelectDialogVisible.value).toBe(false);
  });

  it("triggerFileSelect sets imageSelectDialogVisible to true", () => {
    const result = mountComposable(() => useVerseCoverUpload(opts));
    result.triggerFileSelect();
    expect(result.imageSelectDialogVisible.value).toBe(true);
  });

  it("openLocalUpload sets imageSelectDialogVisible to false", () => {
    const result = mountComposable(() => useVerseCoverUpload(opts));
    result.imageSelectDialogVisible.value = true;
    result.openLocalUpload();
    expect(result.imageSelectDialogVisible.value).toBe(false);
  });
});
