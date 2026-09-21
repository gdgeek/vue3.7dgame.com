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
import EntityInfoDialog from "@/components/Meta/EntityInfoDialog.vue";
import { convertToLocalTime } from "@/utils/utilityFunctions";

const api = vi.hoisted(() => ({ getMeta: vi.fn() }));
vi.mock("@/api/v1/meta", () => ({ getMeta: api.getMeta }));
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

function entity(id: number, title = `Entity ${id}`) {
  return {
    id,
    title,
    uuid: `entity-uuid-${id}`,
    author_id: 8,
    author: { id: 8, nickname: "Lin", username: "lin", email: null },
    info: "Interactive gallery sculpture",
    image: { url: "https://example.com/entity.png" },
    created_at: "2026-09-20 10:30:00",
    updated_at: "2026-09-21 19:45:00",
    resources: [{ id: 9, name: "Sculpture mesh", type: "model" }],
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

async function mount(modelValue = true, entityId = 41) {
  const props = reactive({ modelValue, entityId });
  target = document.createElement("div");
  document.body.append(target);
  app = createApp({ render: () => h(EntityInfoDialog, props) });
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

beforeEach(() => api.getMeta.mockReset());
afterEach(() => {
  app?.unmount();
  app = undefined;
  target?.remove();
});

describe("EntityInfoDialog", () => {
  it("loads the current entity only when opened and displays its read-only information", async () => {
    api.getMeta.mockResolvedValue({ data: entity(41) });
    const props = await mount(false);
    expect(api.getMeta).not.toHaveBeenCalled();

    props.modelValue = true;
    await flush();

    expect(api.getMeta).toHaveBeenCalledWith(
      41,
      { expand: "image,author,resources,verseMetas" },
      expect.any(AbortSignal),
      { skipErrorMessage: true }
    );
    expect(target.textContent).toContain("Entity 41");
    expect(target.textContent).toContain("Lin");
    expect(target.textContent).toContain("Activate sculpture");
    expect(target.textContent).toContain("Sculpture ready");
    const details = Object.fromEntries(
      [...target.querySelectorAll("dt")].map((label) => [
        label.textContent,
        label.nextElementSibling?.textContent,
      ])
    );
    expect(details).toMatchObject({
      ID: "41",
      "meta.list.properties.resources": "1",
      "meta.list.properties.scenes": "meta.list.properties.sceneFallback12",
      "ui.createdAt": convertToLocalTime("2026-09-20 10:30:00"),
      "meta.list.columns.updatedAt": convertToLocalTime("2026-09-21 19:45:00"),
    });
    expect(target.textContent).not.toContain("homepage.concepts.entityEditor");
    expect(
      target.querySelector("input, textarea, [contenteditable=true]")
    ).toBeNull();
  });

  it("aborts the previous entity request and ignores its late response after switching entities", async () => {
    const oldRequest = deferred<{ data: ReturnType<typeof entity> }>();
    api.getMeta.mockReturnValueOnce(oldRequest.promise);
    api.getMeta.mockResolvedValueOnce({ data: entity(42) });
    const props = await mount();
    const oldSignal = api.getMeta.mock.calls[0][2] as AbortSignal;

    props.entityId = 42;
    await flush();
    expect(oldSignal.aborted).toBe(true);
    expect(api.getMeta).toHaveBeenLastCalledWith(
      42,
      expect.any(Object),
      expect.any(AbortSignal),
      { skipErrorMessage: true }
    );
    expect(target.textContent).toContain("Entity 42");

    oldRequest.resolve({ data: entity(41) });
    await flush();
    expect(target.textContent).toContain("Entity 42");
    expect(target.textContent).not.toContain("Entity 41");
  });

  it("clears cached data on reopening and rejects a response from a closed dialog", async () => {
    const closedRequest = deferred<{ data: ReturnType<typeof entity> }>();
    api.getMeta.mockResolvedValueOnce({ data: entity(41, "Original title") });
    api.getMeta.mockReturnValueOnce(closedRequest.promise);
    api.getMeta.mockResolvedValueOnce({ data: entity(41, "Latest title") });
    const props = await mount();
    expect(target.textContent).toContain("Original title");

    props.modelValue = false;
    await flush();
    props.modelValue = true;
    await flush();
    expect(api.getMeta).toHaveBeenCalledTimes(2);
    expect(target.textContent).not.toContain("Original title");
    const closedSignal = api.getMeta.mock.calls[1][2] as AbortSignal;

    props.modelValue = false;
    await flush();
    expect(closedSignal.aborted).toBe(true);
    props.modelValue = true;
    await flush();
    expect(api.getMeta).toHaveBeenCalledTimes(3);
    expect(target.textContent).toContain("Latest title");

    closedRequest.resolve({ data: entity(41, "Stale title") });
    await flush();
    expect(target.textContent).toContain("Latest title");
    expect(target.textContent).not.toContain("Stale title");
  });

  it("shows a recoverable loading failure and reloads the same current entity", async () => {
    api.getMeta.mockRejectedValueOnce(new Error("Unavailable"));
    api.getMeta.mockResolvedValueOnce({ data: entity(41) });
    await mount();
    expect(target.textContent).toContain("meta.scene.infoLoadFailed");

    const retry = [...target.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "meta.scene.infoRetry"
    );
    expect(retry).toBeDefined();
    retry!.click();
    await flush();

    expect(api.getMeta).toHaveBeenCalledTimes(2);
    expect(api.getMeta).toHaveBeenLastCalledWith(
      41,
      expect.any(Object),
      expect.any(AbortSignal),
      { skipErrorMessage: true }
    );
    expect(target.textContent).toContain("Entity 41");
    expect(target.textContent).not.toContain("meta.scene.infoLoadFailed");
  });
});
