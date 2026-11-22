import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  nextTick,
  type App,
  type Component,
} from "vue";
import Document from "@/components/Home/Document.vue";
import DocumentList from "@/components/Home/DocumentList.vue";

const { article, getCategory, posts, push } = vi.hoisted(() => ({
  article: vi.fn(),
  getCategory: vi.fn(),
  posts: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/api/home/wordpress", () => ({
  Article: article,
  getCategory,
  Posts: posts,
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ push }) }));

const wrapper = defineComponent({ template: "<div><slot /></div>" });
const stubs = {
  "el-button": wrapper,
  "el-card": defineComponent({
    template: "<div><slot name='header' /><slot /></div>",
  }),
  "el-empty": defineComponent({
    props: { description: { type: String, required: true } },
    template: "<div>{{ description }}<slot /></div>",
  }),
  "el-pagination": wrapper,
  "el-skeleton": wrapper,
  "el-timeline": wrapper,
  "el-timeline-item": wrapper,
  "el-tooltip": wrapper,
  "router-link": wrapper,
};

beforeEach(() => vi.resetAllMocks());

const mountedApps: App<Element>[] = [];
afterEach(() => mountedApps.splice(0).forEach((app) => app.unmount()));

async function mount(component: Component, props: Record<string, unknown>) {
  const el = document.createElement("div");
  const app = createApp(component, props);
  Object.entries(stubs).forEach(([name, stub]) => app.component(name, stub));
  app.mount(el);
  mountedApps.push(app);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextTick();
  return el;
}

describe("optional WordPress content", () => {
  it("omits the document on a WordPress 502", async () => {
    article.mockRejectedValueOnce({ status: 502 });
    const el = await mount(Document, { postId: 1 });

    expect(el.querySelector(".document-wrapper")).toBeNull();
  });

  it("omits the document list when the category request fails", async () => {
    getCategory.mockRejectedValueOnce(new Error("Network Error"));
    const el = await mount(DocumentList, { categoryId: 1 });

    expect(el.querySelector(".document-list-wrapper")).toBeNull();
    expect(posts).not.toHaveBeenCalled();
  });

  it("omits the document list when the article request fails", async () => {
    getCategory.mockResolvedValueOnce({ data: { name: "News" } });
    posts.mockRejectedValueOnce({ status: 502 });
    const el = await mount(DocumentList, { categoryId: 1 });

    expect(el.querySelector(".document-list-wrapper")).toBeNull();
  });

  it("preserves the document's friendly not-found state", async () => {
    article.mockRejectedValueOnce({ status: 404 });
    const el = await mount(Document, { postId: 1 });

    expect(el.textContent).toContain("文章不存在");
  });

  it("continues to display text for a loaded document", async () => {
    article.mockResolvedValueOnce({
      data: {
        title: { rendered: "Loaded document" },
        content: { rendered: "<p>WordPress contents</p>" },
        date: "2026-11-22T10:00:00",
      },
    });
    const el = await mount(Document, { postId: 1, category: false });

    expect(el.querySelector(".document-title")?.textContent).toBe(
      "Loaded document"
    );
    expect(el.querySelector(".document-body p")?.textContent).toBe(
      "WordPress contents"
    );
  });
});
