import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, reactive, ref } from "vue";
import { ElButton, ElCard, ElInput } from "element-plus";
import { createI18n } from "vue-i18n";
import en from "@/lang/en-US/verse";
import SceneProperties from "@/components/MrPP/MrPPVerse/SceneProperties.vue";
import {
  addSceneProperty,
  getSceneProperties,
  type SceneProperty,
} from "@/api/v1/scene-properties";

vi.mock("@/api/v1/scene-properties", () => ({
  getSceneProperties: vi.fn(),
  addSceneProperty: vi.fn(),
}));

vi.mock("@casl/vue", () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      action === "root" && subject === "all" && permission.root,
  }),
}));

const permission = reactive({ root: true });
const cleanups: Array<() => void> = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  await Promise.resolve();
  await nextTick();
}

async function mount(sceneId = 1) {
  const currentSceneId = ref(sceneId);
  const added = vi.fn();
  const app = createApp({
    setup: () => () =>
      h(SceneProperties, {
        sceneId: currentSceneId.value,
        onAdded: added,
      }),
  });
  app.use(
    createI18n({
      legacy: false,
      locale: "en-US",
      messages: { "en-US": en },
    })
  );
  app.component("ElButton", ElButton);
  app.component("ElCard", ElCard);
  app.component("ElInput", ElInput);
  const el = document.createElement("div");
  document.body.appendChild(el);
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  await flush();
  return { el, currentSceneId, added };
}

async function fill(el: HTMLElement, key: string, info = "") {
  const keyInput = el.querySelector("input")!;
  keyInput.value = key;
  keyInput.dispatchEvent(new Event("input", { bubbles: true }));
  const infoInput = el.querySelector("textarea")!;
  infoInput.value = info;
  infoInput.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}

async function submit(el: HTMLElement) {
  el.querySelector("form")!.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );
  await flush();
}

beforeEach(() => {
  permission.root = true;
  vi.clearAllMocks();
  vi.mocked(getSceneProperties).mockResolvedValue({ data: [] } as never);
});

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("SceneProperties", () => {
  it("hides all UI and makes no request for a non-root user", async () => {
    permission.root = false;
    const { el, currentSceneId } = await mount();
    currentSceneId.value = 2;
    await flush();
    expect(el.textContent).toBe("");
    expect(getSceneProperties).not.toHaveBeenCalled();
    expect(addSceneProperty).not.toHaveBeenCalled();
  });

  it("loads properties, displays JSON info, and labels both inputs", async () => {
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [{ id: 4, key: "spawn", info: { x: 2 } }],
    } as never);
    const { el } = await mount(42);
    expect(getSceneProperties).toHaveBeenCalledWith(42);
    expect(el.querySelector("tbody")?.textContent).toContain("spawn");
    expect(el.querySelector("pre")?.textContent).toContain('"x": 2');
    for (const input of el.querySelectorAll("input, textarea")) {
      expect(el.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    }
  });

  it("shows loading, exposes a retry on failure, then shows the empty state", async () => {
    const load = deferred<{ data: SceneProperty[] }>();
    vi.mocked(getSceneProperties).mockReturnValueOnce(load.promise as never);
    const { el } = await mount();
    expect(el.textContent).toContain("Loading properties");
    expect(
      el.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled
    ).toBe(true);
    load.reject(new Error("offline"));
    await flush();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      "Unable to load"
    );
    await fill(el, "blocked-until-loaded");
    await submit(el);
    expect(addSceneProperty).not.toHaveBeenCalled();
    const retry = Array.from(el.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Retry")
    )!;
    retry.click();
    await flush();
    expect(getSceneProperties).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain("This scene has no properties yet");
  });

  it("trims a new key, shows the server result, and emits it without reloading", async () => {
    const property = { id: 9, key: "weather", info: "rainy" };
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    const { el, added } = await mount(7);
    await fill(el, "  weather  ", "rainy");
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledWith(7, {
      key: "weather",
      info: "rainy",
    });
    expect(el.querySelector("tbody")?.textContent).toContain("weather");
    expect(el.querySelector("tbody")?.textContent).toContain("rainy");
    expect(added).toHaveBeenCalledWith(property);
    expect(getSceneProperties).toHaveBeenCalledTimes(1);
    expect(el.querySelector<HTMLInputElement>("input")?.value).toBe("");
  });

  it("validates the key and UTF-8 info byte limit without sending a request", async () => {
    const { el } = await mount();
    await fill(el, "  ");
    await submit(el);
    expect(el.textContent).toContain("trimmed property key");
    expect(el.querySelector("input")?.getAttribute("aria-invalid")).toBe(
      "true"
    );
    await fill(el, "x".repeat(256));
    await submit(el);
    expect(addSceneProperty).not.toHaveBeenCalled();
    await fill(el, "valid", "中".repeat(21846));
    await submit(el);
    expect(el.textContent).toContain("65,535 bytes");
    expect(addSceneProperty).not.toHaveBeenCalled();
  });

  it("keeps one row when the server returns an existing property", async () => {
    const property = { id: 9, key: "weather", info: "rainy" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    const { el } = await mount();
    await fill(el, "weather", "rainy");
    await submit(el);
    expect(el.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("preserves both fields after an API failure and permits retry", async () => {
    vi.mocked(addSceneProperty)
      .mockRejectedValueOnce(new Error("forbidden"))
      .mockResolvedValueOnce({
        data: {
          success: true,
          property: { id: 10, key: "mode", info: "dark" },
        },
      } as never);
    const { el, added } = await mount();
    await fill(el, "mode", "dark");
    await submit(el);
    expect(el.textContent).toContain("Your input is preserved");
    expect(el.querySelector<HTMLInputElement>("input")?.value).toBe("mode");
    expect(el.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe(
      "dark"
    );
    expect(added).not.toHaveBeenCalled();
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledTimes(2);
    expect(added).toHaveBeenCalledTimes(1);
  });

  it("omits empty info and prevents duplicate submissions while saving", async () => {
    const save = deferred<unknown>();
    vi.mocked(addSceneProperty).mockReturnValueOnce(save.promise as never);
    const { el } = await mount();
    await fill(el, "active");
    await submit(el);
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledTimes(1);
    expect(addSceneProperty).toHaveBeenCalledWith(1, {
      key: "active",
    });
    save.resolve({
      data: { success: true, property: { id: 10, key: "active", info: null } },
    });
    await flush();
    expect(el.textContent).toContain("No description");
  });

  it("ignores an earlier scene's late load response", async () => {
    const oldLoad = deferred<unknown>();
    vi.mocked(getSceneProperties)
      .mockReturnValueOnce(oldLoad.promise as never)
      .mockResolvedValueOnce({
        data: [{ id: 2, key: "new-scene", info: null }],
      } as never);
    const { el, currentSceneId } = await mount(1);
    currentSceneId.value = 2;
    await flush();
    oldLoad.resolve({ data: [{ id: 1, key: "old-scene", info: null }] });
    await flush();
    expect(el.textContent).toContain("new-scene");
    expect(el.textContent).not.toContain("old-scene");
  });

  it("resets input and ignores late save responses after switching scenes", async () => {
    const save = deferred<unknown>();
    vi.mocked(addSceneProperty).mockReturnValueOnce(save.promise as never);
    const { el, currentSceneId, added } = await mount(1);
    await fill(el, "old-property", "old-info");
    await submit(el);
    currentSceneId.value = 2;
    await flush();
    save.resolve({
      data: {
        success: true,
        property: { id: 1, key: "old-property", info: "old-info" },
      },
    });
    await flush();
    expect(getSceneProperties).toHaveBeenLastCalledWith(2);
    expect(el.querySelector<HTMLInputElement>("input")?.value).toBe("");
    expect(el.textContent).not.toContain("old-property");
    expect(added).not.toHaveBeenCalled();
  });

  it("removes root UI on permission loss and ignores the in-flight response", async () => {
    const load = deferred<unknown>();
    vi.mocked(getSceneProperties).mockReturnValueOnce(load.promise as never);
    const { el } = await mount();
    permission.root = false;
    await flush();
    load.resolve({ data: [{ id: 1, key: "private", info: null }] });
    await flush();
    expect(el.textContent).toBe("");
    permission.root = true;
    await flush();
    expect(getSceneProperties).toHaveBeenCalledTimes(2);
    expect(el.textContent).not.toContain("private");
  });
});
