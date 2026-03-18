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

const mockFileStore = vi.hoisted(() => ({
  fileMD5: vi.fn(),
  publicHandler: vi.fn(),
  fileHas: vi.fn(),
  fileUpload: vi.fn(),
  fileUrl: vi.fn(),
}));

vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({ store: mockFileStore }),
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

describe("useVerseCoverUpload — onResourceSelected", () => {
  beforeEach(() => vi.clearAllMocks());

  it("图片类型时调用 getPicture 再 putVerse", async () => {
    const { getPicture } = await import("@/api/v1/resources/index");
    const { putVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getPicture).mockResolvedValueOnce({ data: { image_id: 77 } } as never);
    vi.mocked(putVerse).mockResolvedValueOnce({} as never);
    const openDetail = vi.fn().mockResolvedValue(undefined);
    const currentVerse = ref({ id: 1 } as never);
    const detailLoading = ref(false);
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse, detailLoading, openDetail })
    );
    await result.onResourceSelected({ id: 10, type: "picture" } as never);
    expect(vi.mocked(getPicture)).toHaveBeenCalledWith(10);
    expect(vi.mocked(putVerse)).toHaveBeenCalledWith(1, { image_id: 77 });
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
    expect(detailLoading.value).toBe(false);
  });

  it("非图片类型直接使用 data.id 作为 imageId 调用 putVerse", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    vi.mocked(putVerse).mockResolvedValueOnce({} as never);
    const openDetail = vi.fn().mockResolvedValue(undefined);
    const currentVerse = ref({ id: 2 } as never);
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse, detailLoading: ref(false), openDetail })
    );
    await result.onResourceSelected({ id: 20, type: "model" } as never);
    expect(vi.mocked(putVerse)).toHaveBeenCalledWith(2, { image_id: 20 });
  });

  it("imageId 为空时不调用 putVerse", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const currentVerse = ref({ id: 3 } as never);
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse, detailLoading: ref(false), openDetail: vi.fn() })
    );
    // id=0 is falsy
    await result.onResourceSelected({ id: 0, type: "model" } as never);
    expect(vi.mocked(putVerse)).not.toHaveBeenCalled();
  });

  it("currentVerse 为 null 时不调用 putVerse", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse: ref(null), detailLoading: ref(false), openDetail: vi.fn() })
    );
    await result.onResourceSelected({ id: 5, type: "model" } as never);
    expect(vi.mocked(putVerse)).not.toHaveBeenCalled();
  });

  it("putVerse 失败时显示 error 消息并重置 detailLoading", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(putVerse).mockRejectedValueOnce(new Error("fail"));
    const detailLoading = ref(false);
    const currentVerse = ref({ id: 4 } as never);
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse, detailLoading, openDetail: vi.fn() })
    );
    await result.onResourceSelected({ id: 8, type: "model" } as never);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(detailLoading.value).toBe(false);
  });
});

describe("useVerseCoverUpload — handleCoverUpload 成功路径", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fileHas=true 时跳过上传直接 postFile 并 putVerse", async () => {
    const { postFile } = await import("@/api/v1/files");
    const { putVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    mockFileStore.fileMD5.mockResolvedValue("abc123");
    mockFileStore.publicHandler.mockResolvedValue("handler");
    mockFileStore.fileHas.mockResolvedValue(true);
    mockFileStore.fileUrl.mockReturnValue("https://cdn/abc123.jpg");
    vi.mocked(postFile).mockResolvedValue({ data: { id: 99 } } as never);
    vi.mocked(putVerse).mockResolvedValue({} as never);
    const openDetail = vi.fn().mockResolvedValue(undefined);
    const currentVerse = ref({ id: 5 } as never);
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse, detailLoading: ref(false), openDetail })
    );
    const file = new File(["img"], "cover.jpg", { type: "image/jpeg" });
    const event = { target: { files: [file], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(putVerse)).toHaveBeenCalledWith(5, { image_id: 99 });
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
    expect(openDetail).toHaveBeenCalled();
  });

  it("fileHas=false 时先 fileUpload 再 postFile", async () => {
    const { postFile } = await import("@/api/v1/files");
    const { putVerse } = await import("@/api/v1/verse");
    mockFileStore.fileMD5.mockResolvedValue("def456");
    mockFileStore.publicHandler.mockResolvedValue("h");
    mockFileStore.fileHas.mockResolvedValue(false);
    mockFileStore.fileUpload.mockResolvedValue(undefined);
    mockFileStore.fileUrl.mockReturnValue("https://cdn/def456.jpg");
    vi.mocked(postFile).mockResolvedValue({ data: { id: 88 } } as never);
    vi.mocked(putVerse).mockResolvedValue({} as never);
    const currentVerse = ref({ id: 6 } as never);
    const result = mountComposable(() =>
      useVerseCoverUpload({ currentVerse, detailLoading: ref(false), openDetail: vi.fn().mockResolvedValue(undefined) })
    );
    const file = new File(["img"], "photo.png", { type: "image/png" });
    const event = { target: { files: [file], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(mockFileStore.fileUpload).toHaveBeenCalled();
    expect(vi.mocked(postFile)).toHaveBeenCalled();
    expect(vi.mocked(putVerse)).toHaveBeenCalledWith(6, { image_id: 88 });
  });
});

describe("useVerseCoverUpload — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认让 fileStore 方法返回稳定值，避免依赖默认 undefined 行为
    mockFileStore.fileMD5.mockResolvedValue("md5hash");
    mockFileStore.publicHandler.mockResolvedValue("handler");
    mockFileStore.fileHas.mockResolvedValue(false);
    mockFileStore.fileUpload.mockRejectedValue(new Error("upload failed"));
    mockFileStore.fileUrl.mockReturnValue("https://cdn/file.jpg");
  });

  it("handleCoverUpload returns early and skips postFile when no file is selected", async () => {
    const { postFile } = await import("@/api/v1/files");
    const uploadOpts = {
      currentVerse: ref(null),
      detailLoading: ref(false),
      openDetail: vi.fn(),
    };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    const event = {
      target: { files: [] as File[], value: "" },
    } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(postFile)).not.toHaveBeenCalled();
  });

  it("handleCoverUpload shows error for non-image file type", async () => {
    const { Message } = await import("@/components/Dialog");
    const uploadOpts = {
      currentVerse: ref(null),
      detailLoading: ref(false),
      openDetail: vi.fn(),
    };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    const file = new File(["data"], "document.pdf", {
      type: "application/pdf",
    });
    const event = { target: { files: [file], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });

  it("handleCoverUpload shows error when file exceeds 5 MB limit", async () => {
    const { Message } = await import("@/components/Dialog");
    const uploadOpts = {
      currentVerse: ref(null),
      detailLoading: ref(false),
      openDetail: vi.fn(),
    };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    const event = {
      target: { files: [bigFile], value: "" },
    } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });

  it("handleCoverUpload shows error and resets detailLoading when file store upload fails", async () => {
    const { Message } = await import("@/components/Dialog");
    const detailLoading = ref(false);
    const uploadOpts = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentVerse: ref({ id: 1, name: "v" } as any),
      detailLoading,
      openDetail: vi.fn(),
    };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    // Default mock: fileUpload() returns undefined → .then() throws TypeError → caught
    const file = new File(["data"], "cover.jpg", { type: "image/jpeg" });
    const event = { target: { files: [file], value: "" } } as unknown as Event;
    await result.handleCoverUpload(event);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(detailLoading.value).toBe(false);
  });

  it("openResourceDialog hides image select dialog", () => {
    const uploadOpts = {
      currentVerse: ref(null),
      detailLoading: ref(false),
      openDetail: vi.fn(),
    };
    const result = mountComposable(() => useVerseCoverUpload(uploadOpts));
    result.imageSelectDialogVisible.value = true;
    result.openResourceDialog();
    expect(result.imageSelectDialogVisible.value).toBe(false);
  });
});
