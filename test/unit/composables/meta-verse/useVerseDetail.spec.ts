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

describe("useVerseDetail — error paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("openDetail shows Message.error and resets detailLoading when getVerse rejects", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockRejectedValueOnce(new Error("Network error"));
    const detailOpts = { refresh: vi.fn(), canManage: ref(false) };
    const result = mountComposable(() => useVerseDetail(detailOpts));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1, name: "test" } as any);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(result.detailLoading.value).toBe(false);
  });

  it("openDetail shows Message.error and resets detailLoading when response.data is null", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({ data: null } as never);
    const detailOpts = { refresh: vi.fn(), canManage: ref(false) };
    const result = mountComposable(() => useVerseDetail(detailOpts));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 2 } as any);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(result.detailLoading.value).toBe(false);
  });

  it("openDetail fetches tags when canManage is true", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    const { getTags } = await import("@/api/v1/tags");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 3, name: "v", description: "" },
    } as never);
    vi.mocked(getTags).mockResolvedValueOnce({ data: [] } as never);
    const detailOpts = { refresh: vi.fn(), canManage: ref(true) };
    const result = mountComposable(() => useVerseDetail(detailOpts));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 3 } as any);
    expect(vi.mocked(getTags)).toHaveBeenCalled();
  });

  it("openDetail does NOT fetch tags when canManage is false", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    const { getTags } = await import("@/api/v1/tags");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 4, name: "v", description: "" },
    } as never);
    const detailOpts = { refresh: vi.fn(), canManage: ref(false) };
    const result = mountComposable(() => useVerseDetail(detailOpts));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 4 } as any);
    expect(vi.mocked(getTags)).not.toHaveBeenCalled();
  });

  it("handlePanelClose resets detailVisible and currentVerse", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 5, name: "v", description: "" },
    } as never);
    const detailOpts = { refresh: vi.fn(), canManage: ref(false) };
    const result = mountComposable(() => useVerseDetail(detailOpts));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 5 } as any);
    expect(result.currentVerse.value).not.toBeNull();
    result.handlePanelClose();
    expect(result.currentVerse.value).toBeNull();
  });
});
