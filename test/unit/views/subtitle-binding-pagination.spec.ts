import { createApp, nextTick } from "vue";
import { expect, it, vi } from "vitest";
import SubtitleBindingEditor from "@/views/subtitle/SubtitleBindingEditor.vue";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/utils/request", () => ({ default: api }));

it("keeps the chosen asset across pages and saves it only on confirmation", async () => {
  const items = Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    name: `字幕 ${i + 1}`,
    info: { cueCount: 3, durationMs: 2000 },
  }));
  api.get.mockImplementation(async (url, options) => {
    if (url !== "/v1/subtitles") return { data: { subtitle: null } };
    const start = (options.params.page - 1) * 20;
    const matches = items.filter((asset) =>
      asset.name.includes(options.params.search ?? "")
    );
    return {
      data: { items: matches.slice(start, start + 20), total: matches.length },
    };
  });
  api.put.mockResolvedValue({ data: { subtitle: items[20] } });
  const host = document.createElement("div");
  const app = createApp(SubtitleBindingEditor, { mediaId: 7 });
  document.body.appendChild(host);
  app.mount(host);
  const button = (name: string) =>
    Array.from(host.querySelectorAll("button")).find(
      (el) => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === name
    )!;
  const choices = () =>
    Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  try {
    await vi.waitFor(() => expect(button("选择已有字幕")).toBeDefined());
    button("选择已有字幕").click();
    await vi.waitFor(() => expect(choices()).toHaveLength(20));
    expect(button("上一页").disabled).toBe(true);
    button("下一页").click();
    await vi.waitFor(() =>
      expect(choices()[0].getAttribute("aria-label")).toBe("字幕 21")
    );
    choices()[0].click();
    await nextTick();
    button("下一页").click();
    await vi.waitFor(() => expect(choices()).toHaveLength(5));
    expect(button("下一页").disabled).toBe(true);
    expect(host.textContent).toContain("第 3 / 3 页");
    expect(host.textContent).toContain("已选 · 字幕 21");
    button("上一页").click();
    await vi.waitFor(() => expect(choices()[0].checked).toBe(true));
    const search = host.querySelector<HTMLInputElement>(
      'input[type="search"]'
    )!;
    search.value = "字幕 45";
    search.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(choices()).toHaveLength(1));
    expect(choices()[0].getAttribute("aria-label")).toBe("字幕 45");
    expect(api.get).toHaveBeenLastCalledWith(
      "/v1/subtitles",
      expect.objectContaining({ params: { page: 1, search: "字幕 45" } })
    );
    expect(host.textContent).toContain("已选 · 字幕 21");
    expect(api.put).not.toHaveBeenCalled();
    button("保存绑定").click();
    await vi.waitFor(() =>
      expect(host.textContent).toContain("已绑定 · 字幕 21")
    );
    expect(api.put).toHaveBeenCalledWith(
      "/v1/resources/7/subtitle",
      { subtitleResourceId: 21, previousSubtitleResourceId: null },
      expect.anything()
    );
  } finally {
    app.unmount();
    host.remove();
  }
});
