import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockMessage = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock("@/components/Dialog", () => ({
  Message: mockMessage,
}));

const mockGetMeta = vi.fn();
const mockPutMeta = vi.fn();
vi.mock("@/api/v1/meta", () => ({
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  putMeta: (...args: unknown[]) => mockPutMeta(...args),
}));

const mockGetPicture = vi.fn();
vi.mock("@/api/v1/resources/index", () => ({
  getPicture: (...args: unknown[]) => mockGetPicture(...args),
}));

const mockPostFile = vi.fn();
vi.mock("@/api/v1/files", () => ({
  postFile: (...args: unknown[]) => mockPostFile(...args),
}));

const mockFileStore = {
  store: {
    fileMD5: vi.fn(),
    publicHandler: vi.fn(),
    fileHas: vi.fn(),
    fileUpload: vi.fn(),
    fileUrl: vi.fn(),
  },
};
vi.mock("@/store/modules/config", () => ({
  useFileStore: () => mockFileStore,
}));

// Mock ResourceDialog component type
vi.mock("@/components/MrPP/ResourceDialog.vue", () => ({
  default: {},
}));

const makeMeta = (overrides = {}) => ({
  id: 5,
  title: "Test",
  image: { url: "http://img/1.png" },
  ...overrides,
});

describe("useMetaCoverUpload", () => {
  const mockRefresh = vi.fn();

  const getComposable = (meta = makeMeta()) => {
    const currentMeta = ref<ReturnType<typeof makeMeta> | null>(meta as never);
    const detailLoading = ref(false);

    return import(
      "@/views/meta/list/composables/useMetaCoverUpload"
    ).then(({ useMetaCoverUpload }) => ({
      composable: useMetaCoverUpload({
        currentMeta: currentMeta as never,
        detailLoading,
        refresh: mockRefresh,
      }),
      currentMeta,
      detailLoading,
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("imageSelectDialogVisible starts false", async () => {
      const { composable } = await getComposable();
      expect(composable.imageSelectDialogVisible.value).toBe(false);
    });

    it("resourceDialogRef starts null", async () => {
      const { composable } = await getComposable();
      expect(composable.resourceDialogRef.value).toBeNull();
    });

    it("fileInput starts null", async () => {
      const { composable } = await getComposable();
      expect(composable.fileInput.value).toBeNull();
    });
  });

  describe("triggerFileSelect", () => {
    it("sets imageSelectDialogVisible to true", async () => {
      const { composable } = await getComposable();
      composable.triggerFileSelect();
      expect(composable.imageSelectDialogVisible.value).toBe(true);
    });
  });

  describe("openLocalUpload", () => {
    it("closes dialog and clicks file input", async () => {
      const { composable } = await getComposable();
      const mockClick = vi.fn();
      composable.fileInput.value = { click: mockClick } as never;
      composable.imageSelectDialogVisible.value = true;

      composable.openLocalUpload();

      expect(composable.imageSelectDialogVisible.value).toBe(false);
      expect(mockClick).toHaveBeenCalled();
    });

    it("does not throw when fileInput is null", async () => {
      const { composable } = await getComposable();
      composable.fileInput.value = null;
      expect(() => composable.openLocalUpload()).not.toThrow();
    });
  });

  describe("openResourceDialog", () => {
    it("closes dialog and opens resource dialog", async () => {
      const { composable } = await getComposable();
      const mockOpenIt = vi.fn();
      composable.resourceDialogRef.value = { openIt: mockOpenIt } as never;
      composable.imageSelectDialogVisible.value = true;

      composable.openResourceDialog();

      expect(composable.imageSelectDialogVisible.value).toBe(false);
      expect(mockOpenIt).toHaveBeenCalledWith({ type: "picture" });
    });
  });

  describe("handleCoverUpload", () => {
    const makeFileEvent = (overrides: Partial<File> = {}): Event => {
      const file = {
        name: "photo.jpg",
        type: "image/jpeg",
        size: 1024,
        ...overrides,
      } as File;
      return {
        target: { files: [file], value: "" } as unknown as HTMLInputElement,
      } as Event;
    };

    it("shows error for non-image file", async () => {
      const { composable } = await getComposable();
      const event = makeFileEvent({ type: "application/pdf" });

      await composable.handleCoverUpload(event);

      expect(mockMessage.error).toHaveBeenCalledWith(
        "meta.list.selectImageFile"
      );
    });

    it("shows error for file over 5MB", async () => {
      const { composable } = await getComposable();
      const event = makeFileEvent({ size: 6 * 1024 * 1024, type: "image/png" });

      await composable.handleCoverUpload(event);

      expect(mockMessage.error).toHaveBeenCalledWith("meta.list.imageTooLarge");
    });

    it("does nothing when no file selected", async () => {
      const { composable } = await getComposable();
      const event = {
        target: { files: [], value: "" } as unknown as HTMLInputElement,
      } as Event;

      await composable.handleCoverUpload(event);

      expect(mockFileStore.store.fileMD5).not.toHaveBeenCalled();
    });

    it("uploads file and updates meta image", async () => {
      mockFileStore.store.fileMD5.mockResolvedValue("abc123");
      mockFileStore.store.publicHandler.mockResolvedValue("handler");
      mockFileStore.store.fileHas.mockResolvedValue(true);
      mockFileStore.store.fileUrl.mockReturnValue("http://cdn/photo.jpg");
      mockPostFile.mockResolvedValue({ data: { id: 77 } });
      mockPutMeta.mockResolvedValue({});
      mockGetMeta.mockResolvedValue({ data: makeMeta({ image: { url: "http://new.jpg" } }) });

      const { composable, detailLoading } = await getComposable();
      const event = makeFileEvent({ name: "photo.jpg", type: "image/jpeg", size: 1024 });

      await composable.handleCoverUpload(event);

      expect(mockPutMeta).toHaveBeenCalledWith("5", { image_id: 77 });
      expect(mockMessage.success).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(detailLoading.value).toBe(false);
    });

    it("shows error on upload failure", async () => {
      mockFileStore.store.fileMD5.mockRejectedValue(new Error("MD5 failed"));

      const { composable } = await getComposable();
      const event = makeFileEvent({ name: "photo.jpg", type: "image/jpeg", size: 512 });

      await composable.handleCoverUpload(event);

      expect(mockMessage.error).toHaveBeenCalledWith(
        "meta.metaEdit.image.updateError"
      );
    });
  });

  describe("onResourceSelected", () => {
    it("does nothing when imageId is falsy", async () => {
      const { composable } = await getComposable();
      await composable.onResourceSelected({
        id: 0,
        image: null,
        type: "picture",
        context: null,
        name: "",
        created_at: "",
        enabled: true,
      });
      expect(mockPutMeta).not.toHaveBeenCalled();
    });

    it("does nothing when currentMeta is null", async () => {
      const { composable, currentMeta } = await getComposable();
      currentMeta.value = null;

      await composable.onResourceSelected({
        id: 3,
        image: { url: "http://img/x.jpg", id: 3 },
        type: "other",
        context: null,
        name: "img",
        created_at: "",
        enabled: true,
      });
      expect(mockPutMeta).not.toHaveBeenCalled();
    });

    it("fetches picture details for picture type", async () => {
      mockGetPicture.mockResolvedValue({ data: { image_id: 88 } });
      mockPutMeta.mockResolvedValue({});
      mockGetMeta.mockResolvedValue({ data: makeMeta() });

      const { composable } = await getComposable();
      await composable.onResourceSelected({
        id: 7,
        image: { url: "http://img/x.jpg", id: 7 },
        type: "picture",
        context: null,
        name: "img",
        created_at: "",
        enabled: true,
      });

      expect(mockGetPicture).toHaveBeenCalledWith(7);
      expect(mockPutMeta).toHaveBeenCalledWith("5", { image_id: 88 });
    });

    it("uses image id directly for non-picture type", async () => {
      mockPutMeta.mockResolvedValue({});
      mockGetMeta.mockResolvedValue({ data: makeMeta() });

      const { composable } = await getComposable();
      await composable.onResourceSelected({
        id: 9,
        image: { url: "http://img/x.jpg", id: 55 },
        type: "image",
        context: null,
        name: "img",
        created_at: "",
        enabled: true,
      });

      expect(mockPutMeta).toHaveBeenCalledWith("5", { image_id: 55 });
    });
  });
});
