import { createApp, defineComponent, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import News from "@/views/web/components/News/index.vue";

const { posts } = vi.hoisted(() => ({ posts: vi.fn() }));

vi.mock("@/api/home/wordpress", () => ({ Posts: posts }));
vi.mock("@/composables/useAOS", () => ({ useAOS: vi.fn() }));
vi.mock("@/store/modules/settings", () => ({
  useSettingsStore: () => ({ theme: "light" }),
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/utils/logger", () => ({ logger: { warn: vi.fn() } }));

const unmounts: Array<() => void> = [];
afterEach(() => unmounts.splice(0).forEach((unmount) => unmount()));

const article = (id: number) => ({
  id,
  title: { rendered: `XRUGC test article ${id}` },
  excerpt: { rendered: "Exhibit walkthrough" },
  date: "2026-11-22T08:30:00",
});

async function mountNews() {
  const el = document.createElement("div");
  const app = createApp(News);
  const Slot = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h("div", slots.default?.()),
  });
  for (const name of [
    "ElTabs",
    "ElTabPane",
    "ElTimeline",
    "ElTimelineItem",
    "ElSkeleton",
    "ElTag",
    "ElIcon",
    "ElDialog",
    "ElButton",
    "ElPagination",
    "ElResult",
  ])
    app.component(name, Slot);
  app.config.globalProperties.$t = (key: string) => key;
  app.mount(el);
  unmounts.push(() => app.unmount());
  await Promise.resolve();
  await nextTick();
  return el;
}

describe("optional WordPress news", () => {
  beforeEach(() => {
    posts.mockReset();
  });

  it("removes the news section when WordPress responds with 502", async () => {
    posts.mockRejectedValue({ status: 502 });
    const el = await mountNews();

    expect(el.querySelector(".news-section")).toBeNull();
  });

  it("continues to show entries returned by WordPress", async () => {
    posts.mockResolvedValue({
      data: [article(4)],
      headers: { "x-wp-totalpages": "1", "x-wp-total": "1" },
    });
    const el = await mountNews();

    expect(el.querySelector(".news-section")).not.toBeNull();
    expect(el.querySelector(".article-title")?.textContent).toBe(
      "XRUGC test article 4"
    );
  });

  it("drops the expand action and retains entries when expansion fails", async () => {
    posts
      .mockResolvedValueOnce({
        data: [article(4), article(5), article(6)],
        headers: { "x-wp-totalpages": "2", "x-wp-total": "6" },
      })
      .mockRejectedValueOnce({ status: 502 });
    const el = await mountNews();
    el.querySelector<HTMLElement>(".expand-button")!.click();
    await Promise.resolve();
    await nextTick();

    expect(posts).toHaveBeenCalledTimes(2);
    expect(el.querySelector(".news-more")).toBeNull();
    expect(el.querySelector(".article-title")?.textContent).toBe(
      "XRUGC test article 4"
    );
  });
});
