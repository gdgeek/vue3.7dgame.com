import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, reactive, ref } from "vue";
import {
  ElButton,
  ElCard,
  ElDialog,
  ElInput,
  ElIcon,
  ElSelect,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
} from "element-plus";
import { createI18n } from "vue-i18n";
import en from "@/lang/en-US/verse";
import ScenePropertiesDialog from "@/components/MrPP/MrPPVerse/ScenePropertiesDialog.vue";
import {
  addSceneProperty,
  getSceneProperties,
  getScenePropertyOptions,
  getScenePropertyUsage,
  deleteGlobalSceneProperty,
  removeSceneProperty,
} from "@/api/v1/scene-properties";

vi.mock("@/api/v1/scene-properties", () => ({
  getSceneProperties: vi.fn(),
  getScenePropertyOptions: vi.fn(),
  addSceneProperty: vi.fn(),
  removeSceneProperty: vi.fn(),
  getScenePropertyUsage: vi.fn(),
  deleteGlobalSceneProperty: vi.fn(),
}));
vi.mock("@casl/vue", () => ({
  useAbility: () => ({
    can: (action: string, subject: string) =>
      subject === "all" &&
      ((action === "root" && permission.role === "root") ||
        (action === "admin" && ["root", "admin"].includes(permission.role))),
  }),
}));

const permission = reactive({ role: "root" });
const cleanups: Array<() => void> = [];

async function flush() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
    await nextTick();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function mount() {
  const sceneId = ref(42);
  const added = vi.fn();
  const removed = vi.fn();
  const globallyDeleted = vi.fn();
  const openChange = vi.fn();
  const target = document.createElement("div");
  document.body.append(target);
  const app = createApp({
    setup: () => () =>
      h(ScenePropertiesDialog, {
        sceneId: sceneId.value,
        sceneName: "Test scene",
        onAdded: added,
        onRemoved: removed,
        onGloballyDeleted: globallyDeleted,
        onOpenChange: openChange,
      }),
  });
  app.use(
    createI18n({
      legacy: false,
      locale: "en-US",
      messages: { "en-US": en },
    })
  );
  for (const [name, component] of Object.entries({
    ElButton,
    ElCard,
    ElDialog,
    ElInput,
    ElIcon,
    ElSelect,
    ElOption,
    ElRadioButton,
    ElRadioGroup,
  })) {
    app.component(name, component);
  }
  app.mount(target);
  cleanups.push(() => {
    app.unmount();
    target.remove();
  });
  await flush();
  return { target, sceneId, added, removed, globallyDeleted, openChange };
}

async function open(target: HTMLElement) {
  target.querySelector<HTMLElement>(".scene-properties-manage")!.click();
  await flush();
  const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
  expect(dialog).not.toBeNull();
  return dialog!;
}

function closeButton(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === "Done"
  )!;
}

beforeEach(() => {
  permission.role = "root";
  vi.clearAllMocks();
  vi.mocked(getSceneProperties).mockResolvedValue({ data: [] } as never);
  vi.mocked(getScenePropertyOptions).mockResolvedValue({ data: [] } as never);
});

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("ScenePropertiesDialog", () => {
  it("loads on demand in a separate modal and refreshes after closing and reopening", async () => {
    vi.mocked(getSceneProperties)
      .mockResolvedValueOnce({
        data: [{ id: 1, key: "original", info: null }],
      } as never)
      .mockResolvedValueOnce({
        data: [{ id: 2, key: "refreshed", info: null }],
      } as never);
    const { target, openChange } = await mount();
    expect(getSceneProperties).not.toHaveBeenCalled();
    expect(getScenePropertyOptions).not.toHaveBeenCalled();
    const firstDialog = await open(target);
    expect(target.querySelector('[role="dialog"]')).toBeNull();
    expect(firstDialog.textContent).toContain("Test scene");
    expect(firstDialog.querySelector("tbody")?.textContent).toContain(
      "original"
    );
    expect(openChange).toHaveBeenLastCalledWith(true);

    closeButton(firstDialog).click();
    await flush();
    expect(document.body.querySelector(".scene-properties")).toBeNull();
    expect(openChange).toHaveBeenLastCalledWith(false);
    const reopened = await open(target);
    expect(getSceneProperties).toHaveBeenCalledTimes(2);
    expect(getScenePropertyOptions).toHaveBeenCalledTimes(2);
    expect(reopened.querySelector("tbody")?.textContent).toContain("refreshed");
    expect(reopened.querySelector("tbody")?.textContent).not.toContain(
      "original"
    );
  });

  it("keeps the modal open while saving and emits the added property before allowing close", async () => {
    const save = deferred<unknown>();
    const property = { id: 7, key: "public", info: "Public scene" };
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(addSceneProperty).mockReturnValueOnce(save.promise as never);
    const { target, added, openChange } = await mount();
    const dialog = await open(target);
    dialog.querySelector<HTMLElement>('[role="combobox"]')!.click();
    await flush();
    const option = dialog.querySelector<HTMLElement>('[role="option"]')!;
    option.click();
    await flush();
    dialog
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flush();
    expect(closeButton(dialog).disabled).toBe(true);
    closeButton(dialog).click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    await flush();
    expect(openChange).toHaveBeenLastCalledWith(true);
    expect(document.body.querySelector(".scene-properties")).not.toBeNull();

    save.resolve({ data: { success: true, property } });
    await flush();
    expect(added).toHaveBeenCalledWith(property);
    expect(document.body.querySelector(".scene-properties")).not.toBeNull();
    expect(closeButton(dialog).disabled).toBe(false);
    closeButton(dialog).click();
    await flush();
    expect(openChange).toHaveBeenLastCalledWith(false);
  });

  it("closes the modal with Escape when no save is in progress", async () => {
    const { target, openChange } = await mount();
    await open(target);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    await flush();
    await vi.waitFor(() => {
      expect(document.body.querySelector(".scene-properties")).toBeNull();
    });
    expect(openChange).toHaveBeenLastCalledWith(false);
    expect(target.querySelector(".scene-properties-manage")).not.toBeNull();
  });

  it("hides the entry for users without property management access and clears an open modal when permission is revoked", async () => {
    permission.role = "user";
    const { target, openChange } = await mount();
    expect(target.textContent).toBe("");
    expect(getSceneProperties).not.toHaveBeenCalled();
    permission.role = "root";
    await flush();
    await open(target);
    permission.role = "user";
    await flush();
    expect(document.body.querySelector(".scene-properties")).toBeNull();
    expect(openChange).toHaveBeenLastCalledWith(false);
    expect(target.textContent).toBe("");
  });

  it("closes when the selected scene changes and discards the closed scene's pending response", async () => {
    const oldLoad = deferred<unknown>();
    vi.mocked(getSceneProperties)
      .mockReturnValueOnce(oldLoad.promise as never)
      .mockResolvedValueOnce({
        data: [{ id: 2, key: "current-scene", info: null }],
      } as never);
    const { target, sceneId, openChange } = await mount();
    await open(target);
    sceneId.value = 43;
    await flush();
    expect(document.body.querySelector(".scene-properties")).toBeNull();
    expect(openChange).toHaveBeenLastCalledWith(false);
    oldLoad.resolve({ data: [{ id: 1, key: "old-scene", info: null }] });
    await flush();
    const dialog = await open(target);
    expect(getSceneProperties).toHaveBeenLastCalledWith(43);
    expect(dialog.textContent).toContain("current-scene");
    expect(dialog.textContent).not.toContain("old-scene");
  });

  it("keeps the modal open during removal and forwards the removed property", async () => {
    const property = { id: 7, key: "public", info: "Public scene" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property],
    } as never);
    const removal = deferred<unknown>();
    vi.mocked(removeSceneProperty).mockReturnValueOnce(
      removal.promise as never
    );
    const { target, removed, openChange } = await mount();
    const dialog = await open(target);
    const removeButton = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "Remove")!;
    removeButton.click();
    await flush();
    const confirmButton = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "Confirm removal")!;
    confirmButton.click();
    await flush();
    expect(closeButton(dialog).disabled).toBe(true);
    closeButton(dialog).click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    await flush();
    expect(openChange).toHaveBeenLastCalledWith(true);
    expect(document.body.querySelector(".scene-properties")).not.toBeNull();
    removal.resolve({ data: { success: true, property } });
    await flush();
    expect(removed).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledWith(property);
    expect(document.body.querySelector(".scene-properties")).not.toBeNull();
    expect(closeButton(dialog).disabled).toBe(false);
    closeButton(dialog).click();
    await flush();
    expect(openChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps the modal open during impact lookup and global deletion and forwards the result", async () => {
    const property = { id: 7, key: "public", info: "Public scene" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property],
    } as never);
    const usage = deferred<unknown>();
    const deletion = deferred<unknown>();
    vi.mocked(getScenePropertyUsage).mockReturnValueOnce(
      usage.promise as never
    );
    vi.mocked(deleteGlobalSceneProperty).mockReturnValueOnce(
      deletion.promise as never
    );
    const { target, globallyDeleted, openChange } = await mount();
    const dialog = await open(target);
    const button = (text: string) =>
      Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
        (item) => item.textContent?.trim() === text
      )!;
    button("Delete property").click();
    await flush();
    expect(closeButton(dialog).disabled).toBe(true);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    await flush();
    expect(openChange).toHaveBeenLastCalledWith(true);
    usage.resolve({ data: { property, sceneCount: 3 } });
    await flush();
    const checkbox = dialog.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    )!;
    checkbox.click();
    await flush();
    button("Delete everywhere").click();
    await flush();
    expect(closeButton(dialog).disabled).toBe(true);
    closeButton(dialog).click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
      })
    );
    await flush();
    expect(openChange).toHaveBeenLastCalledWith(true);
    deletion.resolve({
      data: { success: true, property, affectedSceneCount: 3 },
    });
    await flush();
    expect(globallyDeleted).toHaveBeenCalledTimes(1);
    expect(globallyDeleted).toHaveBeenCalledWith(property);
    expect(document.body.querySelector(".scene-properties")).not.toBeNull();
    expect(closeButton(dialog).disabled).toBe(false);
  });

  it("opens property management for admin with only existing-property association and unlink controls", async () => {
    permission.role = "admin";
    const linked = { id: 8, key: "weather", info: null };
    const available = { id: 9, key: "lighting", info: null };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [linked],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [linked, available],
    } as never);
    const { target } = await mount();
    expect(target.querySelector(".scene-properties-manage")).not.toBeNull();
    const dialog = await open(target);
    expect(dialog.querySelector("tbody")?.textContent).toContain(linked.key);
    expect(dialog.querySelector('input[value="new"]')).toBeNull();
    expect(dialog.textContent).not.toContain("Delete property");
    expect(dialog.querySelector('[role="combobox"]')).not.toBeNull();
    expect(
      Array.from(dialog.querySelectorAll("button")).some(
        (item) => item.textContent?.trim() === "Remove"
      )
    ).toBe(true);
    expect(getScenePropertyUsage).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("hides the management entry for a manager", async () => {
    permission.role = "manager";
    const { target } = await mount();
    expect(target.textContent).toBe("");
    expect(getSceneProperties).not.toHaveBeenCalled();
    expect(getScenePropertyOptions).not.toHaveBeenCalled();
  });
});
