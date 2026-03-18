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

describe("useVerseDetail — detailProperties computed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when currentVerse is null", () => {
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    expect(result.detailProperties.value).toEqual([]);
  });

  it("returns 3 property items when currentVerse is set", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: {
        id: 1,
        name: "v",
        description: "",
        created_at: "2024-01-01T00:00:00Z",
        author: { nickname: "Alice", username: "alice" },
      },
    } as never);
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    expect(result.detailProperties.value).toHaveLength(3);
  });

  it("uses username when nickname is absent", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: {
        id: 2,
        name: "v",
        description: "",
        author: { username: "bob" },
      },
    } as never);
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 2 } as any);
    const authorProp = result.detailProperties.value[1];
    expect(authorProp.value).toBe("bob");
  });

  it("uses '—' when author is absent", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 3, name: "v", description: "" },
    } as never);
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 3 } as any);
    const authorProp = result.detailProperties.value[1];
    expect(authorProp.value).toBe("—");
  });
});

describe("useVerseDetail — handleDescriptionBlur", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing when currentVerse is null", async () => {
    const { putVerse } = await import("@/api/v1/verse");
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    await result.handleDescriptionBlur();
    expect(vi.mocked(putVerse)).not.toHaveBeenCalled();
  });

  it("does nothing when description is unchanged", async () => {
    const { getVerse, putVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 1, name: "v", description: "same" },
    } as never);
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    result.editingDescription.value = "same";
    await result.handleDescriptionBlur();
    expect(vi.mocked(putVerse)).not.toHaveBeenCalled();
  });

  it("calls putVerse and refresh on description change success", async () => {
    const { getVerse, putVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 1, name: "v", description: "old" },
    } as never);
    vi.mocked(putVerse).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseDetail({ refresh, canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    result.editingDescription.value = "new";
    await result.handleDescriptionBlur();
    expect(vi.mocked(putVerse)).toHaveBeenCalledWith(1, { description: "new" });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows error and reverts on putVerse failure", async () => {
    const { getVerse, putVerse } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 1, name: "v", description: "original" },
    } as never);
    vi.mocked(putVerse).mockRejectedValueOnce(new Error("fail"));
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    result.editingDescription.value = "changed";
    await result.handleDescriptionBlur();
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
    expect(result.editingDescription.value).toBe("original");
  });
});

describe("useVerseDetail — isTagSelected", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false when currentVerse is null", () => {
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    expect(result.isTagSelected(1)).toBeFalsy();
  });

  it("returns true when tag is in verseTags", async () => {
    const { getVerse } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 1, name: "v", description: "", verseTags: [{ id: 5, name: "tag5" }] },
    } as never);
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    expect(result.isTagSelected(5)).toBe(true);
    expect(result.isTagSelected(99)).toBe(false);
  });
});

describe("useVerseDetail — handleAddTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns early when tagId is undefined", async () => {
    const { addTag } = await import("@/api/v1/verse");
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    await result.handleAddTag(undefined);
    expect(vi.mocked(addTag)).not.toHaveBeenCalled();
  });

  it("returns early when currentVerse is null", async () => {
    const { addTag } = await import("@/api/v1/verse");
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    await result.handleAddTag(1);
    expect(vi.mocked(addTag)).not.toHaveBeenCalled();
  });

  it("adds tag and calls refresh on success", async () => {
    const { getVerse, addTag } = await import("@/api/v1/verse");
    const { getTags } = await import("@/api/v1/tags");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 10, name: "v", description: "", verseTags: [] },
    } as never);
    vi.mocked(getTags).mockResolvedValueOnce({
      data: [{ id: 7, name: "mytag" }],
    } as never);
    vi.mocked(addTag).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseDetail({ refresh, canManage: ref(true) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 10 } as any);
    await result.handleAddTag(7);
    expect(vi.mocked(addTag)).toHaveBeenCalledWith(10, 7);
    expect(refresh).toHaveBeenCalled();
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
    expect(result.selectedTag.value).toBeUndefined();
  });

  it("shows error when addTag fails", async () => {
    const { getVerse, addTag } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 10, name: "v", description: "" },
    } as never);
    vi.mocked(addTag).mockRejectedValueOnce(new Error("fail"));
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 10 } as any);
    await result.handleAddTag(3);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });
});

describe("useVerseDetail — handleRemoveTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns early when currentVerse is null", async () => {
    const { removeTag } = await import("@/api/v1/verse");
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    await result.handleRemoveTag(1);
    expect(vi.mocked(removeTag)).not.toHaveBeenCalled();
  });

  it("removes tag and calls refresh on success", async () => {
    const { getVerse, removeTag } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 5, name: "v", description: "", verseTags: [{ id: 3, name: "t" }] },
    } as never);
    vi.mocked(removeTag).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseDetail({ refresh, canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 5 } as any);
    await result.handleRemoveTag(3);
    expect(vi.mocked(removeTag)).toHaveBeenCalledWith(5, 3);
    expect(refresh).toHaveBeenCalled();
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.currentVerse.value as any).verseTags).toHaveLength(0);
  });

  it("shows error when removeTag fails", async () => {
    const { getVerse, removeTag } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 5, name: "v", description: "" },
    } as never);
    vi.mocked(removeTag).mockRejectedValueOnce(new Error("fail"));
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 5 } as any);
    await result.handleRemoveTag(99);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });
});

describe("useVerseDetail — handleVisibilityChange", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns early when currentVerse is null", async () => {
    const { addPublic } = await import("@/api/v1/verse");
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    await result.handleVisibilityChange(true);
    expect(vi.mocked(addPublic)).not.toHaveBeenCalled();
  });

  it("returns early when isPublic matches current value", async () => {
    const { getVerse, addPublic } = await import("@/api/v1/verse");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 1, name: "v", description: "", public: true },
    } as never);
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    await result.handleVisibilityChange(true);
    expect(vi.mocked(addPublic)).not.toHaveBeenCalled();
  });

  it("calls addPublic when making verse public", async () => {
    const { getVerse, addPublic } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 1, name: "v", description: "", public: false },
    } as never);
    vi.mocked(addPublic).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseDetail({ refresh, canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 1 } as any);
    await result.handleVisibilityChange(true);
    expect(vi.mocked(addPublic)).toHaveBeenCalledWith(1);
    expect(refresh).toHaveBeenCalled();
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
  });

  it("calls removePublic when making verse private", async () => {
    const { getVerse, removePublic } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 2, name: "v", description: "", public: true },
    } as never);
    vi.mocked(removePublic).mockResolvedValueOnce({} as never);
    const refresh = vi.fn();
    const result = mountComposable(() =>
      useVerseDetail({ refresh, canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 2 } as any);
    await result.handleVisibilityChange(false);
    expect(vi.mocked(removePublic)).toHaveBeenCalledWith(2);
    expect(refresh).toHaveBeenCalled();
    expect(vi.mocked(Message.success)).toHaveBeenCalled();
  });

  it("shows error when visibility update fails", async () => {
    const { getVerse, addPublic } = await import("@/api/v1/verse");
    const { Message } = await import("@/components/Dialog");
    vi.mocked(getVerse).mockResolvedValueOnce({
      data: { id: 3, name: "v", description: "", public: false },
    } as never);
    vi.mocked(addPublic).mockRejectedValueOnce(new Error("fail"));
    const result = mountComposable(() =>
      useVerseDetail({ refresh: vi.fn(), canManage: ref(false) })
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await result.openDetail({ id: 3 } as any);
    await result.handleVisibilityChange(true);
    expect(vi.mocked(Message.error)).toHaveBeenCalled();
  });
});
