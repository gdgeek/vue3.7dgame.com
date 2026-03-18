import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? k : k),
  }),
}));

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
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

describe("useVerseCrud — 成功路径", () => {
  beforeEach(() => vi.clearAllMocks());

  it("goToEditor 调用 router.push 跳转到编辑器", () => {
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    result.goToEditor({ id: 42, name: "My Scene" } as never);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/verse/scene", query: expect.objectContaining({ id: 42 }) })
    );
  });

  it("handleGoToEditor 当 currentVerse 有值时调用 goToEditor", () => {
    const currentVerse = ref({ id: 7, name: "V" } as never);
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse, detailVisible: ref(false) })
    );
    result.handleGoToEditor();
    expect(mockPush).toHaveBeenCalled();
  });

  it("handleGoToEditor 当 currentVerse 为 null 时不调用 router.push", () => {
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    result.handleGoToEditor();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("submitCreate 成功时调用 router.push", async () => {
    const { postVerse } = await import("@/api/v1/verse");
    vi.mocked(postVerse).mockResolvedValueOnce({ data: { id: 100 } } as never);

    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.submitCreate({ name: "New Scene", description: "desc" }, null);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ id: 100 }) })
    );
  });

  it("submitCreate 携带 imageId 时附加 image_id", async () => {
    const { postVerse } = await import("@/api/v1/verse");
    vi.mocked(postVerse).mockResolvedValueOnce({ data: { id: 55 } } as never);

    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.submitCreate({ name: "n", description: "" }, 9);
    expect(vi.mocked(postVerse)).toHaveBeenCalledWith(
      expect.objectContaining({ image_id: 9 })
    );
  });

  it("handleRename 成功时更新 currentVerse.name 并调用 refresh", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    vi.mocked(putVerse).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const currentVerse = ref({ id: 5, name: "old" } as never);
    const result = mountComposable(() =>
      useVerseCrud({ refresh, currentVerse, detailVisible: ref(false) })
    );
    await result.handleRename("new name");
    expect((currentVerse.value as { name: string }).name).toBe("new name");
    expect(refresh).toHaveBeenCalled();
  });

  it("handleDelete 成功时将 detailVisible 设为 false 并调用 refresh", async () => {
    const { deleteVerse } = await import("@/api/v1/verse");
    const { MessageBox } = await import("@/components/Dialog");
    vi.mocked(MessageBox.confirm).mockResolvedValueOnce(undefined as never);
    vi.mocked(deleteVerse).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const detailVisible = ref(true);
    const currentVerse = ref({ id: 10, name: "s" } as never);
    const result = mountComposable(() =>
      useVerseCrud({ refresh, currentVerse, detailVisible })
    );
    await result.handleDelete();
    expect(detailVisible.value).toBe(false);
    expect(refresh).toHaveBeenCalled();
  });

  it("handleExport 成功时显示 success 消息", async () => {
    const { exportScene } = await import("@/services/scene-package/export-service");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(exportScene).mockResolvedValueOnce(undefined as never);
    const currentVerse = ref({ id: 3 } as never);
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse, detailVisible: ref(false) })
    );
    await result.handleExport();
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
  });

  it("handleExport 失败时显示 error 消息", async () => {
    const { exportScene } = await import("@/services/scene-package/export-service");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(exportScene).mockRejectedValueOnce(new Error("export failed"));
    const currentVerse = ref({ id: 3 } as never);
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse, detailVisible: ref(false) })
    );
    await result.handleExport();
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });

  it("handleExport 当 currentVerse 为 null 时直接返回", async () => {
    const { exportScene } = await import("@/services/scene-package/export-service");
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.handleExport();
    expect(vi.mocked(exportScene)).not.toHaveBeenCalled();
  });

  it("handleImportSuccess 关闭对话框并调用 refresh", async () => {
    const { Message } = await import("@/components/Dialog");
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseCrud({ refresh, currentVerse: ref(null), detailVisible: ref(false) })
    );
    result.openImportDialog();
    expect(result.importDialogVisible.value).toBe(true);
    result.handleImportSuccess(99);
    expect(result.importDialogVisible.value).toBe(false);
    expect(refresh).toHaveBeenCalled();
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
  });

  it("namedWindow 成功时调用 putVerse 并 refresh", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const { MessageBox } = await import("@/components/Dialog");
    vi.mocked(MessageBox.prompt).mockResolvedValueOnce({ value: "renamed" } as never);
    vi.mocked(putVerse).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseCrud({ refresh, currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.namedWindow({ id: 1, name: "old" } as never);
    expect(vi.mocked(putVerse)).toHaveBeenCalledWith(1, { name: "renamed" });
    expect(refresh).toHaveBeenCalled();
  });

  it("namedWindow 取消时显示 info 消息", async () => {
    const { MessageBox, Message } = await import("@/components/Dialog");
    vi.mocked(MessageBox.prompt).mockRejectedValueOnce(new Error("cancel"));
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.namedWindow({ id: 1, name: "x" } as never);
    expect(vi.mocked(Message.info)).toHaveBeenCalled();
  });

  it("deletedWindow 成功时调用 deleteVerse 并 refresh", async () => {
    const { deleteVerse } = await import("@/api/v1/verse");
    const { MessageBox } = await import("@/components/Dialog");
    vi.mocked(MessageBox.confirm).mockResolvedValueOnce(undefined as never);
    vi.mocked(deleteVerse).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseCrud({ refresh, currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.deletedWindow({ id: 2, name: "scene" } as never);
    expect(vi.mocked(deleteVerse)).toHaveBeenCalledWith(2);
    expect(refresh).toHaveBeenCalled();
  });

  it("deletedWindow 取消时显示 info 消息", async () => {
    const { MessageBox, Message } = await import("@/components/Dialog");
    vi.mocked(MessageBox.confirm).mockRejectedValueOnce(new Error("cancel"));
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    await result.deletedWindow({ id: 2, name: "scene" } as never);
    expect(vi.mocked(Message.info)).toHaveBeenCalled();
  });

  it("createWindow 当 createdDialog 为 null 时不报错", () => {
    const result = mountComposable(() =>
      useVerseCrud({ refresh: vi.fn(), currentVerse: ref(null), detailVisible: ref(false) })
    );
    expect(() => result.createWindow()).not.toThrow();
  });
});

describe("useVerseCrud — API error paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submitCreate logs error when postVerse rejects", async () => {
    const { postVerse } = await import("@/api/v1/verse");
    const { logger } = await import("@/utils/logger");
    vi.mocked(postVerse).mockRejectedValueOnce(new Error("API failure"));
    const currentVerse = ref<null>(null);
    const crudOpts = {
      refresh: vi.fn(),
      currentVerse,
      detailVisible: ref(false),
    };
    const result = mountComposable(() => useVerseCrud(crudOpts));
    await result.submitCreate({ name: "test", description: "" }, null);
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });

  it("handleDelete returns early and never calls deleteVerse when currentVerse is null", async () => {
    const { deleteVerse } = await import("@/api/v1/verse");
    const currentVerse = ref<null>(null);
    const crudOpts = {
      refresh: vi.fn(),
      currentVerse,
      detailVisible: ref(false),
    };
    const result = mountComposable(() => useVerseCrud(crudOpts));
    await result.handleDelete();
    expect(vi.mocked(deleteVerse)).not.toHaveBeenCalled();
  });

  it("handleDelete calls Message.info on deleteVerse failure", async () => {
    const { deleteVerse } = await import("@/api/v1/verse");
    const { MessageBox, Message } = await import("@/components/Dialog");
    vi.mocked(MessageBox.confirm).mockResolvedValueOnce(undefined as never);
    vi.mocked(deleteVerse).mockRejectedValueOnce(new Error("delete failed"));
    const currentVerse = ref({ id: 99, name: "scene" } as Parameters<
      typeof useVerseCrud
    >[0]["currentVerse"]["value"] &
      object);
    const crudOpts = {
      refresh: vi.fn(),
      currentVerse,
      detailVisible: ref(false),
    };
    const result = mountComposable(() => useVerseCrud(crudOpts));
    await result.handleDelete();
    expect(vi.mocked(Message.info)).toHaveBeenCalled();
  });

  it("handleRename does nothing when currentVerse is null", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const currentVerse = ref<null>(null);
    const crudOpts = {
      refresh: vi.fn(),
      currentVerse,
      detailVisible: ref(false),
    };
    const result = mountComposable(() => useVerseCrud(crudOpts));
    await result.handleRename("new name");
    expect(vi.mocked(putVerse)).not.toHaveBeenCalled();
  });

  it("handleRename shows Message.error when putVerse rejects", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(putVerse).mockRejectedValueOnce(new Error("put failed"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentVerse = ref({ id: 5, name: "old name" } as any);
    const refresh = vi.fn();
    const crudOpts = { refresh, currentVerse, detailVisible: ref(false) };
    const result = mountComposable(() => useVerseCrud(crudOpts));
    await result.handleRename("new name");
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
