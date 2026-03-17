import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMessage = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const mockMessageBox = {
  confirm: vi.fn(),
  prompt: vi.fn(),
};
vi.mock("@/components/Dialog", () => ({
  Message: mockMessage,
  MessageBox: mockMessageBox,
}));

const mockGetMeta = vi.fn();
const mockPutMeta = vi.fn();
const mockDeleteMeta = vi.fn();
const mockPostMeta = vi.fn();
const mockPutMetaCode = vi.fn();
vi.mock("@/api/v1/meta", () => ({
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  putMeta: (...args: unknown[]) => mockPutMeta(...args),
  deleteMeta: (...args: unknown[]) => mockDeleteMeta(...args),
  postMeta: (...args: unknown[]) => mockPostMeta(...args),
  putMetaCode: (...args: unknown[]) => mockPutMetaCode(...args),
}));

vi.mock("uuid", () => ({ v4: () => "test-uuid" }));

const makeMeta = (overrides = {}) => ({
  id: 42,
  title: "Test Meta",
  author: { nickname: "Alice", username: "alice" },
  image: { url: "http://img.test/1.png" },
  resources: [1, 2],
  events: {
    inputs: [{ title: "Input A", name: "inputA", type: "string" }],
    outputs: [{ title: "Output B", name: "outputB", type: "number" }],
  },
  image_id: 10,
  data: null,
  info: null,
  prefab: 0,
  metaCode: null,
  ...overrides,
});

describe("useMetaDetail", () => {
  const mockRefresh = vi.fn();
  const mockLogMetaStructure = vi.fn();

  const getComposable = async () => {
    const { useMetaDetail } = await import(
      "@/views/meta/list/composables/useMetaDetail"
    );
    return useMetaDetail({
      refresh: mockRefresh,
      logMetaStructure: mockLogMetaStructure,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("initializes with detailVisible false", async () => {
      const { detailVisible } = await getComposable();
      expect(detailVisible.value).toBe(false);
    });

    it("initializes with detailLoading false", async () => {
      const { detailLoading } = await getComposable();
      expect(detailLoading.value).toBe(false);
    });

    it("initializes currentMeta as null", async () => {
      const { currentMeta } = await getComposable();
      expect(currentMeta.value).toBeNull();
    });

    it("returns empty detailProperties when no meta", async () => {
      const { detailProperties } = await getComposable();
      expect(detailProperties.value).toEqual([]);
    });

    it("returns empty eventInputs when no meta", async () => {
      const { eventInputs } = await getComposable();
      expect(eventInputs.value).toEqual([]);
    });

    it("returns empty eventOutputs when no meta", async () => {
      const { eventOutputs } = await getComposable();
      expect(eventOutputs.value).toEqual([]);
    });
  });

  describe("openDetail", () => {
    it("sets detailVisible true and loads meta", async () => {
      const meta = makeMeta();
      mockGetMeta.mockResolvedValue({ data: meta });

      const { openDetail, detailVisible, detailLoading, currentMeta } =
        await getComposable();

      await openDetail(meta as never);

      expect(detailVisible.value).toBe(true);
      expect(detailLoading.value).toBe(false);
      expect(currentMeta.value).toEqual(meta);
      expect(mockGetMeta).toHaveBeenCalledWith(42, { expand: "image,author" });
      expect(mockLogMetaStructure).toHaveBeenCalledWith("detail", meta);
    });

    it("shows error message on fetch failure", async () => {
      mockGetMeta.mockRejectedValue(new Error("Network error"));

      const { openDetail } = await getComposable();
      const meta = makeMeta();

      await openDetail(meta as never);

      expect(mockMessage.error).toHaveBeenCalledWith("Error: Network error");
    });
  });

  describe("handlePanelClose", () => {
    it("clears currentMeta", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      const { openDetail, handlePanelClose, currentMeta } =
        await getComposable();

      await openDetail(makeMeta() as never);
      expect(currentMeta.value).not.toBeNull();

      handlePanelClose();
      expect(currentMeta.value).toBeNull();
    });
  });

  describe("goToEditor", () => {
    it("pushes to /meta/scene with id and title", async () => {
      const { goToEditor } = await getComposable();
      const meta = makeMeta();

      goToEditor(meta as never);

      expect(mockPush).toHaveBeenCalledWith({
        path: "/meta/scene",
        query: expect.objectContaining({ id: 42 }),
      });
    });
  });

  describe("handleGoToEditor", () => {
    it("does nothing when no currentMeta", async () => {
      const { handleGoToEditor } = await getComposable();
      handleGoToEditor();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("navigates when currentMeta is set", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      const { openDetail, handleGoToEditor } = await getComposable();

      await openDetail(makeMeta() as never);
      handleGoToEditor();

      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe("detailProperties", () => {
    it("returns 4 properties when meta is loaded", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      const { openDetail, detailProperties } = await getComposable();

      await openDetail(makeMeta() as never);
      expect(detailProperties.value).toHaveLength(4);
    });

    it("shows author nickname", async () => {
      const meta = makeMeta({ author: { nickname: "Bob", username: "bob" } });
      mockGetMeta.mockResolvedValue({ data: meta });
      const { openDetail, detailProperties } = await getComposable();

      await openDetail(meta as never);

      const authorProp = detailProperties.value.find((p) =>
        p.label.includes("author")
      );
      expect(authorProp?.value).toBe("Bob");
    });

    it("falls back to username when no nickname", async () => {
      const meta = makeMeta({
        author: { nickname: null, username: "charlie" },
      });
      mockGetMeta.mockResolvedValue({ data: meta });
      const { openDetail, detailProperties } = await getComposable();

      await openDetail(meta as never);

      const authorProp = detailProperties.value.find((p) =>
        p.label.includes("author")
      );
      expect(authorProp?.value).toBe("charlie");
    });
  });

  describe("eventInputs / eventOutputs", () => {
    it("normalizes event inputs", async () => {
      const meta = makeMeta();
      mockGetMeta.mockResolvedValue({ data: meta });
      const { openDetail, eventInputs } = await getComposable();

      await openDetail(meta as never);

      expect(eventInputs.value).toHaveLength(1);
      expect(eventInputs.value[0].title).toBe("Input A");
      expect(eventInputs.value[0].type).toBe("string");
    });

    it("normalizes event outputs", async () => {
      const meta = makeMeta();
      mockGetMeta.mockResolvedValue({ data: meta });
      const { openDetail, eventOutputs } = await getComposable();

      await openDetail(meta as never);

      expect(eventOutputs.value).toHaveLength(1);
      expect(eventOutputs.value[0].title).toBe("Output B");
    });

    it("returns empty array when events is null", async () => {
      const meta = makeMeta({ events: null });
      mockGetMeta.mockResolvedValue({ data: meta });
      const { openDetail, eventInputs, eventOutputs } = await getComposable();

      await openDetail(meta as never);

      expect(eventInputs.value).toEqual([]);
      expect(eventOutputs.value).toEqual([]);
    });
  });

  describe("handleRename", () => {
    it("calls putMeta and updates currentMeta title", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      mockPutMeta.mockResolvedValue({});
      const { openDetail, handleRename, currentMeta } = await getComposable();

      await openDetail(makeMeta() as never);
      await handleRename("New Title");

      expect(mockPutMeta).toHaveBeenCalledWith("42", { title: "New Title" });
      expect(currentMeta.value?.title).toBe("New Title");
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockMessage.success).toHaveBeenCalled();
    });

    it("does nothing when no currentMeta", async () => {
      const { handleRename } = await getComposable();
      await handleRename("New Title");
      expect(mockPutMeta).not.toHaveBeenCalled();
    });

    it("shows error on failure", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      mockPutMeta.mockRejectedValue(new Error("Update failed"));
      const { openDetail, handleRename } = await getComposable();

      await openDetail(makeMeta() as never);
      await handleRename("New Title");

      expect(mockMessage.error).toHaveBeenCalled();
    });
  });

  describe("handleDelete", () => {
    it("deletes meta after confirmation", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      mockMessageBox.confirm.mockResolvedValue(undefined);
      mockDeleteMeta.mockResolvedValue({});
      const { openDetail, handleDelete, detailVisible } = await getComposable();

      await openDetail(makeMeta() as never);
      await handleDelete();

      expect(mockDeleteMeta).toHaveBeenCalledWith("42");
      expect(detailVisible.value).toBe(false);
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockMessage.success).toHaveBeenCalled();
    });

    it("shows info when user cancels", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      mockMessageBox.confirm.mockRejectedValue(new Error("cancelled"));
      const { openDetail, handleDelete } = await getComposable();

      await openDetail(makeMeta() as never);
      await handleDelete();

      expect(mockDeleteMeta).not.toHaveBeenCalled();
      expect(mockMessage.info).toHaveBeenCalled();
    });

    it("does nothing when no currentMeta", async () => {
      const { handleDelete } = await getComposable();
      await handleDelete();
      expect(mockMessageBox.confirm).not.toHaveBeenCalled();
    });
  });

  describe("handleCopy", () => {
    it("does nothing when no currentMeta", async () => {
      const { handleCopy } = await getComposable();
      await handleCopy();
      expect(mockMessageBox.prompt).not.toHaveBeenCalled();
    });

    it("shows info when user cancels copy prompt", async () => {
      mockGetMeta.mockResolvedValue({ data: makeMeta() });
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));
      const { openDetail, handleCopy } = await getComposable();

      await openDetail(makeMeta() as never);
      await handleCopy();

      expect(mockMessage.info).toHaveBeenCalled();
    });

    it("calls postMeta on successful copy", async () => {
      const meta = makeMeta();
      mockGetMeta.mockResolvedValue({ data: meta });
      mockMessageBox.prompt.mockResolvedValue({ value: "Copy of Test" });
      mockPostMeta.mockResolvedValue({ data: { id: 99 } });

      const { openDetail, handleCopy } = await getComposable();
      await openDetail(meta as never);
      await handleCopy();

      expect(mockPostMeta).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Copy of Test" })
      );
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
