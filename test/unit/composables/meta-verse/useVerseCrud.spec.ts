import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (k: string, opts?: Record<string, unknown>) => (opts ? k : k),
  }),
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
