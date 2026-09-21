import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  reactive,
  type App,
} from "vue";
import { ElButton, ElImage, ElSkeleton } from "element-plus";
import SceneInfoDialog from "@/components/SceneInfoDialog.vue";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const api = vi.hoisted(() => ({ getVerse: vi.fn() }));
vi.mock("@/api/v1/verse", () => ({ getVerse: api.getVerse }));
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

let app: App | undefined;
let target: HTMLDivElement;

const flush = async () => {
  await nextTick();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  await nextTick();
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function scene(id: number, title = `Scene ${id}`) {
  return {
    id,
    name: title,
    uuid: `entity-uuid-${id}`,
    author_id: 8,
    author: { id: 8, nickname: "Lin", username: "lin", email: null },
    info: "Interactive gallery sculpture",
    image: { url: "https://example.com/entity.png" },
    created_at: "2026-09-20 10:30:00",
    updated_at: "2026-09-21 19:45:00",
    description: "Interactive gallery sculpture",
    public: true,
    metas: [{ id: 9, title: "Sculpture mesh" }],
    verseTags: [{ id: 1, name: "Gallery" }],
    events: {
      inputs: [{ name: "activate", title: "Activate sculpture" }],
      outputs: [{ name: "ready", title: "Sculpture ready" }],
    },
    verseMetas: [
      { id: 1, verse_id: 12, meta_id: id },
      { id: 2, verse_id: 12, meta_id: id },
    ],
  };
}

async function mount(modelValue = true, sceneId = 41) {
  const props = reactive({ modelValue, sceneId });
  target = document.createElement("div");
  document.body.append(target);
  app = createApp({ render: () => h(SceneInfoDialog, props) });
  app.component("ElButton", ElButton);
  app.component("ElImage", ElImage);
  app.component("ElSkeleton", ElSkeleton);
  app.component(
    "ElDialog",
    defineComponent({
      props: { modelValue: Boolean, title: String },
      setup(dialogProps, { slots }) {
        return () =>
          dialogProps.modelValue
            ? h("section", { role: "dialog" }, [
                dialogProps.title,
                slots.header?.({ titleId: "entity-info-title" }),
                slots.default?.(),
                slots.footer?.(),
              ])
            : null;
      },
    })
  );
  app.mount(target);
  await flush();
  return props;
}

beforeEach(() => api.getVerse.mockReset());
afterEach(() => {
  app?.unmount();
  app = undefined;
  target?.remove();
});

describe("SceneInfoDialog", () => {
  it("loads the current entity only when opened and displays its read-only information", async () => {
    api.getVerse.mockResolvedValue({ data: scene(41) });
    const props = await mount(false);
    expect(api.getVerse).not.toHaveBeenCalled();

    props.modelValue = true;
    await flush();

    expect(api.getVerse).toHaveBeenCalledWith(
      41,
      "image,author,metas,verseTags",
      "js",
      expect.any(AbortSignal),
      { skipErrorMessage: true }
    );
    expect(target.textContent).toContain("Scene 41");
    expect(target.textContent).toContain("Lin");
    expect(target.textContent).toContain("Interactive gallery sculpture");
    const details = Object.fromEntries(
      [...target.querySelectorAll("dt")].map((label) => [
        label.textContent,
        label.nextElementSibling?.textContent,
      ])
    );
    expect(details).toMatchObject({
      "verse.listPage.sceneId": "41",
      "verse.listPage.loadedEntities": "Sculpture mesh",
      "verse.listPage.sceneTags": "Gallery",
      "verse.listPage.visibility": "verse.listPage.public",
      "verse.listPage.createdTime": convertToLocalTime("2026-09-20 10:30:00"),
      "verse.listPage.modifiedDate": convertToLocalTime("2026-09-21 19:45:00"),
    });
    expect(target.textContent).not.toContain("homepage.concepts.sceneEditor");
    expect(
      target.querySelector("input, textarea, [contenteditable=true]")
    ).toBeNull();
  });

  it("aborts the previous entity request and ignores its late response after switching entities", async () => {
    const oldRequest = deferred<{ data: ReturnType<typeof scene> }>();
    api.getVerse.mockReturnValueOnce(oldRequest.promise);
    api.getVerse.mockResolvedValueOnce({ data: scene(42) });
    const props = await mount();
    const oldSignal = api.getVerse.mock.calls[0][3] as AbortSignal;

    props.sceneId = 42;
    await flush();
    expect(oldSignal.aborted).toBe(true);
    expect(api.getVerse).toHaveBeenLastCalledWith(
      42,
      "image,author,metas,verseTags",
      "js",
      expect.any(AbortSignal),
      { skipErrorMessage: true }
    );
    expect(target.textContent).toContain("Scene 42");

    oldRequest.resolve({ data: scene(41) });
    await flush();
    expect(target.textContent).toContain("Scene 42");
    expect(target.textContent).not.toContain("Scene 41");
  });

  it("clears cached data on reopening and rejects a response from a closed dialog", async () => {
    const closedRequest = deferred<{ data: ReturnType<typeof scene> }>();
    api.getVerse.mockResolvedValueOnce({ data: scene(41, "Original title") });
    api.getVerse.mockReturnValueOnce(closedRequest.promise);
    api.getVerse.mockResolvedValueOnce({ data: scene(41, "Latest title") });
    const props = await mount();
    expect(target.textContent).toContain("Original title");

    props.modelValue = false;
    await flush();
    props.modelValue = true;
    await flush();
    expect(api.getVerse).toHaveBeenCalledTimes(2);
    expect(target.textContent).not.toContain("Original title");
    const closedSignal = api.getVerse.mock.calls[1][3] as AbortSignal;

    props.modelValue = false;
    await flush();
    expect(closedSignal.aborted).toBe(true);
    props.modelValue = true;
    await flush();
    expect(api.getVerse).toHaveBeenCalledTimes(3);
    expect(target.textContent).toContain("Latest title");

    closedRequest.resolve({ data: scene(41, "Stale title") });
    await flush();
    expect(target.textContent).toContain("Latest title");
    expect(target.textContent).not.toContain("Stale title");
  });

  it("shows a recoverable loading failure and reloads the same current entity", async () => {
    api.getVerse.mockRejectedValueOnce(new Error("Unavailable"));
    api.getVerse.mockResolvedValueOnce({ data: scene(41) });
    await mount();
    expect(target.textContent).toContain("verse.toolbar.infoLoadFailed");

    const retry = [...target.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "verse.toolbar.retry"
    );
    expect(retry).toBeDefined();
    retry!.click();
    await flush();

    expect(api.getVerse).toHaveBeenCalledTimes(2);
    expect(api.getVerse).toHaveBeenLastCalledWith(
      41,
      "image,author,metas,verseTags",
      "js",
      expect.any(AbortSignal),
      { skipErrorMessage: true }
    );
    expect(target.textContent).toContain("Scene 41");
    expect(target.textContent).not.toContain("verse.toolbar.infoLoadFailed");
  });
});
