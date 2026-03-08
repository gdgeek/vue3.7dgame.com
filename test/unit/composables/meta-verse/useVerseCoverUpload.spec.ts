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

describe("useVerseCoverUpload — error paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("handleCoverUpload returns early and skips postFile when no file is selected", async () => {
    const { postFile } = await import("@/api/v1/files");
    const uploadOpts = { currentVerse: ref(null), detailLoading: ref(false), openDetail: vi.fn() };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    const event = { target: { files: [] as File[], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(postFile)).not.toHaveBeenCalled();
  });

  it("handleCoverUpload shows error for non-image file type", async () => {
    const { Message } = await import("@/components/Dialog");
    const uploadOpts = { currentVerse: ref(null), detailLoading: ref(false), openDetail: vi.fn() };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    const file = new File(["data"], "document.pdf", { type: "application/pdf" });
    const event = { target: { files: [file], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });

  it("handleCoverUpload shows error when file exceeds 5 MB limit", async () => {
    const { Message } = await import("@/components/Dialog");
    const uploadOpts = { currentVerse: ref(null), detailLoading: ref(false), openDetail: vi.fn() };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const event = { target: { files: [bigFile], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });

  it("handleCoverUpload shows error and resets detailLoading when file store upload fails", async () => {
    const { Message } = await import("@/components/Dialog");
    const detailLoading = ref(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadOpts = { currentVerse: ref({ id: 1, name: "v" } as any), detailLoading, openDetail: vi.fn() };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    // Default mock: fileUpload() returns undefined → .then() throws TypeError → caught
    const file = new File(["data"], "cover.jpg", { type: "image/jpeg" });
    const event = { target: { files: [file], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(detailLoading.value).toBe(false);
  });

  it("openResourceDialog hides image select dialog", () => {
    const uploadOpts = { currentVerse: ref(null), detailLoading: ref(false), openDetail: vi.fn() };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    result.imageSelectDialogVisible.value = true;
    result.openResourceDialog();
    expect(result.imageSelectDialogVisible.value).toBe(false);
  });
});
