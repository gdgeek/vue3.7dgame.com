import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockMessage = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
const mockMessageBox = { confirm: vi.fn(), prompt: vi.fn() };
vi.mock("@/components/Dialog", () => ({
  Message: mockMessage,
  MessageBox: mockMessageBox,
}));

const mockGetMeta = vi.fn();
const mockPostMeta = vi.fn();
const mockPutMeta = vi.fn();
const mockDeleteMeta = vi.fn();
const mockPutMetaCode = vi.fn();
vi.mock("@/api/v1/meta", () => ({
  getMeta: (...args: unknown[]) => mockGetMeta(...args),
  postMeta: (...args: unknown[]) => mockPostMeta(...args),
  putMeta: (...args: unknown[]) => mockPutMeta(...args),
  deleteMeta: (...args: unknown[]) => mockDeleteMeta(...args),
  putMetaCode: (...args: unknown[]) => mockPutMetaCode(...args),
}));

vi.mock("uuid", () => ({ v4: () => "test-uuid" }));

const makeMeta = (overrides = {}) => ({
  id: 10,
  title: "My Meta",
  image_id: 5,
  data: null,
  info: null,
  events: null,
  prefab: 0,
  metaCode: null,
  ...overrides,
});

describe("useMetaActions", () => {
  const mockRefresh = vi.fn();

  const getComposable = async () => {
    const { useMetaActions } = await import(
      "@/views/meta/list/composables/useMetaActions"
    );
    return useMetaActions({ refresh: mockRefresh });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addMeta", () => {
    it("creates meta with trimmed name on confirm", async () => {
      mockMessageBox.prompt.mockResolvedValue({ value: "  New Entity  " });
      mockPostMeta.mockResolvedValue({ data: { id: 1 } });

      const { addMeta } = await getComposable();
      await addMeta();

      expect(mockPostMeta).toHaveBeenCalledWith(
        expect.objectContaining({ title: "New Entity", uuid: "test-uuid" })
      );
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockMessage.success).toHaveBeenCalled();
    });

    it("does nothing when user cancels prompt", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));

      const { addMeta } = await getComposable();
      await addMeta();

      expect(mockPostMeta).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("shows prompt with default name containing date", async () => {
      mockMessageBox.prompt.mockResolvedValue({ value: "test" });
      mockPostMeta.mockResolvedValue({ data: { id: 1 } });

      const { addMeta } = await getComposable();
      await addMeta();

      expect(mockMessageBox.prompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ defaultValue: expect.stringContaining("_") })
      );
    });
  });

  describe("copyWindow", () => {
    it("copies meta with new title on confirm", async () => {
      const meta = makeMeta();
      mockMessageBox.prompt.mockResolvedValue({ value: "Copy of My Meta" });
      mockGetMeta.mockResolvedValue({ data: meta });
      mockPostMeta.mockResolvedValue({ data: { id: 20 } });

      const { copyWindow } = await getComposable();
      await copyWindow(meta as never);

      expect(mockGetMeta).toHaveBeenCalledWith(10, {
        expand: "image,author,metaCode",
      });
      expect(mockPostMeta).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Copy of My Meta" })
      );
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockMessage.success).toHaveBeenCalled();
    });

    it("shows info when user cancels", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));

      const { copyWindow } = await getComposable();
      await copyWindow(makeMeta() as never);

      expect(mockPostMeta).not.toHaveBeenCalled();
      expect(mockMessage.info).toHaveBeenCalled();
    });

    it("copies metaCode if present", async () => {
      const meta = makeMeta({
        metaCode: { blockly: "<xml>...</xml>", lua: "return true" },
      });
      mockMessageBox.prompt.mockResolvedValue({ value: "Copy" });
      mockGetMeta.mockResolvedValue({ data: meta });
      mockPostMeta.mockResolvedValue({ data: { id: 21 } });
      mockPutMetaCode.mockResolvedValue({});

      const { copyWindow } = await getComposable();
      await copyWindow(meta as never);

      expect(mockPutMetaCode).toHaveBeenCalledWith(21, meta.metaCode);
    });

    it("skips putMetaCode when metaCode is null", async () => {
      const meta = makeMeta({ metaCode: null });
      mockMessageBox.prompt.mockResolvedValue({ value: "Copy" });
      mockGetMeta.mockResolvedValue({ data: meta });
      mockPostMeta.mockResolvedValue({ data: { id: 22 } });

      const { copyWindow } = await getComposable();
      await copyWindow(meta as never);

      expect(mockPutMetaCode).not.toHaveBeenCalled();
    });
  });

  describe("namedWindow", () => {
    it("renames meta on confirm", async () => {
      mockMessageBox.prompt.mockResolvedValue({ value: "Renamed Meta" });
      mockPutMeta.mockResolvedValue({});

      const { namedWindow } = await getComposable();
      await namedWindow(makeMeta() as never);

      expect(mockPutMeta).toHaveBeenCalledWith("10", { title: "Renamed Meta" });
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockMessage.success).toHaveBeenCalled();
    });

    it("shows info when user cancels", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));

      const { namedWindow } = await getComposable();
      await namedWindow(makeMeta() as never);

      expect(mockPutMeta).not.toHaveBeenCalled();
      expect(mockMessage.info).toHaveBeenCalled();
    });

    it("uses item.title as default value in prompt", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));
      const meta = makeMeta({ title: "Original Title" });

      const { namedWindow } = await getComposable();
      await namedWindow(meta as never);

      expect(mockMessageBox.prompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ defaultValue: "Original Title" })
      );
    });
  });

  describe("copyWindow — error path (lines 46-48)", () => {
    it("logs error and shows error message when getMeta fails inside copy()", async () => {
      const { logger } = await import("@/utils/logger");
      mockMessageBox.prompt.mockResolvedValue({ value: "Copy" });
      mockGetMeta.mockRejectedValueOnce(new Error("network failure"));

      const { copyWindow } = await getComposable();
      await copyWindow(makeMeta() as never);

      expect(vi.mocked(logger.error)).toHaveBeenCalled();
      expect(mockMessage.error).toHaveBeenCalled();
    });

    it("logs error and shows error message when postMeta fails inside copy()", async () => {
      const { logger } = await import("@/utils/logger");
      const meta = makeMeta();
      mockMessageBox.prompt.mockResolvedValue({ value: "Copy" });
      mockGetMeta.mockResolvedValueOnce({ data: meta });
      mockPostMeta.mockRejectedValueOnce(new Error("server error"));

      const { copyWindow } = await getComposable();
      await copyWindow(meta as never);

      expect(vi.mocked(logger.error)).toHaveBeenCalled();
      expect(mockMessage.error).toHaveBeenCalled();
    });
  });

  describe("addMeta — inputValidator (line 61)", () => {
    it("inputValidator returns error key when value is empty", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));
      const { addMeta } = await getComposable();
      await addMeta();

      const promptCall = mockMessageBox.prompt.mock.calls[0];
      const options = promptCall[2] as {
        inputValidator: (val: string) => string | boolean;
      };
      expect(options.inputValidator("")).not.toBe(true);
      expect(typeof options.inputValidator("")).toBe("string");
    });

    it("inputValidator returns true when value is non-empty", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));
      const { addMeta } = await getComposable();
      await addMeta();

      const promptCall = mockMessageBox.prompt.mock.calls[0];
      const options = promptCall[2] as {
        inputValidator: (val: string) => string | boolean;
      };
      expect(options.inputValidator("Valid Name")).toBe(true);
    });

    it("inputValidator returns error key when value is only whitespace", async () => {
      mockMessageBox.prompt.mockRejectedValue(new Error("cancelled"));
      const { addMeta } = await getComposable();
      await addMeta();

      const promptCall = mockMessageBox.prompt.mock.calls[0];
      const options = promptCall[2] as {
        inputValidator: (val: string) => string | boolean;
      };
      expect(options.inputValidator("   ")).not.toBe(true);
    });
  });

  describe("deletedWindow", () => {
    it("deletes meta after confirmation", async () => {
      mockMessageBox.confirm.mockResolvedValue(undefined);
      mockDeleteMeta.mockResolvedValue({});
      const resetLoading = vi.fn();

      const { deletedWindow } = await getComposable();
      await deletedWindow(makeMeta() as never, resetLoading);

      expect(mockDeleteMeta).toHaveBeenCalledWith("10");
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockMessage.success).toHaveBeenCalled();
      expect(resetLoading).not.toHaveBeenCalled();
    });

    it("calls resetLoading and shows info on cancel", async () => {
      mockMessageBox.confirm.mockRejectedValue(new Error("cancelled"));
      const resetLoading = vi.fn();

      const { deletedWindow } = await getComposable();
      await deletedWindow(makeMeta() as never, resetLoading);

      expect(mockDeleteMeta).not.toHaveBeenCalled();
      expect(resetLoading).toHaveBeenCalled();
      expect(mockMessage.info).toHaveBeenCalled();
    });
  });
});
