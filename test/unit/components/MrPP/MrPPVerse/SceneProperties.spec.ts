import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, reactive, ref } from "vue";
import {
  ElButton,
  ElCard,
  ElInput,
  ElIcon,
  ElSelect,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
} from "element-plus";
import { createI18n } from "vue-i18n";
import en from "@/lang/en-US/verse";
import SceneProperties from "@/components/MrPP/MrPPVerse/SceneProperties.vue";
import {
  addSceneProperty,
  getSceneProperties,
  getScenePropertyOptions,
  getScenePropertyUsage,
  deleteGlobalSceneProperty,
  removeSceneProperty,
  type SceneProperty,
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
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(sceneId = 1) {
  const currentSceneId = ref(sceneId);
  const added = vi.fn();
  const removed = vi.fn();
  const globallyDeleted = vi.fn();
  const busyChange = vi.fn();
  const app = createApp({
    setup: () => () =>
      h(SceneProperties, {
        sceneId: currentSceneId.value,
        onAdded: added,
        onRemoved: removed,
        onGloballyDeleted: globallyDeleted,
        onBusyChange: busyChange,
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
  app.component("ElIcon", ElIcon);
  app.component("ElSelect", ElSelect);
  app.component("ElOption", ElOption);
  app.component("ElRadioButton", ElRadioButton);
  app.component("ElRadioGroup", ElRadioGroup);
  const el = document.createElement("div");
  document.body.appendChild(el);
  app.mount(el);
  cleanups.push(() => {
    app.unmount();
    el.remove();
  });
  await flush();
  return { el, currentSceneId, added, removed, globallyDeleted, busyChange };
}

async function mode(el: HTMLElement, value: "new" | "existing") {
  const radio = el.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
  radio.click();
  await flush();
}

function existingOptions(el: HTMLElement) {
  return Array.from(el.querySelectorAll<HTMLElement>('[role="option"]')).filter(
    (item) => item.style.display !== "none"
  );
}

function existingOption(el: HTMLElement, key: string) {
  return existingOptions(el).find((item) => item.textContent?.includes(key));
}

async function openExistingOptions(el: HTMLElement) {
  const combobox = el.querySelector<HTMLElement>('[role="combobox"]')!;
  expect(combobox).not.toBeNull();
  if (combobox.getAttribute("aria-expanded") !== "true") combobox.click();
  await flush();
}

async function chooseExisting(el: HTMLElement, key: string) {
  await openExistingOptions(el);
  const option = existingOption(el, key);
  expect(option).toBeDefined();
  option!.click();
  await flush();
}

function buttonWithText(el: HTMLElement, text: string) {
  const button = Array.from(
    el.querySelectorAll<HTMLButtonElement>("button")
  ).find((item) => item.textContent?.trim() === text);
  expect(button).toBeDefined();
  return button!;
}

async function clickButton(el: HTMLElement, text: string) {
  buttonWithText(el, text).click();
  await flush();
}

function propertyRow(el: HTMLElement, key: string) {
  const row = Array.from(
    el.querySelectorAll<HTMLTableRowElement>("tbody tr")
  ).find((item) => item.querySelector('th[scope="row"]')?.textContent === key);
  expect(row).toBeDefined();
  return row!;
}

function globalDeletePanel(el: HTMLElement) {
  return el.querySelector<HTMLElement>(
    '[role="group"][aria-label="Delete property from library"]'
  );
}

async function acknowledgeGlobalDeletion(el: HTMLElement) {
  const checkbox = globalDeletePanel(el)!.querySelector<HTMLInputElement>(
    'input[type="checkbox"]'
  )!;
  expect(checkbox).not.toBeNull();
  if (!checkbox.checked) checkbox.click();
  await flush();
}

function prepareGlobalProperty(
  property = { id: 8, key: "weather", info: null as unknown },
  sceneCount = 3
) {
  vi.mocked(getSceneProperties).mockResolvedValue({
    data: [property],
  } as never);
  vi.mocked(getScenePropertyOptions).mockResolvedValue({
    data: [property],
  } as never);
  vi.mocked(getScenePropertyUsage).mockResolvedValue({
    data: { property, sceneCount },
  } as never);
  vi.mocked(deleteGlobalSceneProperty).mockResolvedValue({
    data: { success: true, property, affectedSceneCount: sceneCount },
  } as never);
  return property;
}

async function fill(el: HTMLElement, key: string, info = "") {
  await mode(el, "new");
  const keyInput = el.querySelector<HTMLInputElement>(
    ".scene-properties__form input"
  )!;
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
  permission.role = "root";
  vi.clearAllMocks();
  vi.mocked(getSceneProperties).mockResolvedValue({ data: [] } as never);
  vi.mocked(getScenePropertyOptions).mockResolvedValue({ data: [] } as never);
});

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("SceneProperties", () => {
  it("hides all UI and makes no request for a user without property management access", async () => {
    permission.role = "user";
    const { el, currentSceneId } = await mount();
    currentSceneId.value = 2;
    await flush();
    expect(el.textContent).toBe("");
    expect(getSceneProperties).not.toHaveBeenCalled();
    expect(getScenePropertyOptions).not.toHaveBeenCalled();
    expect(addSceneProperty).not.toHaveBeenCalled();
    expect(removeSceneProperty).not.toHaveBeenCalled();
    expect(getScenePropertyUsage).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("loads properties, displays JSON info, and labels both inputs", async () => {
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [{ id: 4, key: "spawn", info: { x: 2 } }],
    } as never);
    const { el } = await mount(42);
    expect(getSceneProperties).toHaveBeenCalledWith(42);
    expect(el.querySelector("tbody")?.textContent).toContain("spawn");
    expect(el.querySelector("pre")?.textContent).toContain('"x": 2');
    await mode(el, "new");
    for (const input of el.querySelectorAll(
      ".scene-properties__form input, textarea"
    )) {
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
    expect(
      el.querySelector<HTMLInputElement>(".scene-properties__form input")?.value
    ).toBe("");
  });

  it("validates the key and UTF-8 info byte limit without sending a request", async () => {
    const { el } = await mount();
    await fill(el, "  ");
    await submit(el);
    expect(el.textContent).toContain("trimmed property key");
    expect(
      el
        .querySelector(".scene-properties__form input")
        ?.getAttribute("aria-invalid")
    ).toBe("true");
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
    expect(
      el.querySelector<HTMLInputElement>(".scene-properties__form input")?.value
    ).toBe("mode");
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
    await mode(el, "new");
    expect(
      el.querySelector<HTMLInputElement>(".scene-properties__form input")?.value
    ).toBe("");
    expect(el.textContent).not.toContain("old-property");
    expect(added).not.toHaveBeenCalled();
  });

  it("removes root UI on permission loss and ignores the in-flight response", async () => {
    const load = deferred<unknown>();
    vi.mocked(getSceneProperties).mockReturnValueOnce(load.promise as never);
    const { el } = await mount();
    permission.role = "user";
    await flush();
    load.resolve({ data: [{ id: 1, key: "private", info: null }] });
    await flush();
    expect(el.textContent).toBe("");
    permission.role = "root";
    await flush();
    expect(getSceneProperties).toHaveBeenCalledTimes(2);
    expect(el.textContent).not.toContain("private");
  });

  it("starts in existing mode, previews its description, and associates by ID", async () => {
    const property = { id: 8, key: "weather", info: "Rain and wind" };
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    const { el, added } = await mount(42);
    expect(getScenePropertyOptions).toHaveBeenCalledWith(42);
    expect(el.querySelector("textarea")).toBeNull();
    expect(
      el.querySelector<HTMLInputElement>('input[value="existing"]')?.checked
    ).toBe(true);
    await chooseExisting(el, "weather");
    expect(el.textContent).toContain("Rain and wind");
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledWith(42, { propertyId: 8 });
    expect(added).toHaveBeenCalledWith(property);
    expect(el.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(el.querySelector("tbody")?.textContent).toContain("weather");
  });

  it("disables properties already linked to the scene and prevents repeat association", async () => {
    const linked = { id: 8, key: "already-linked", info: null };
    const available = { id: 9, key: "available", info: null };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [linked],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [linked, available],
    } as never);
    const save = deferred<unknown>();
    vi.mocked(addSceneProperty).mockReturnValueOnce(save.promise as never);
    const { el } = await mount();
    await openExistingOptions(el);
    const linkedOption = existingOption(el, "already-linked")!;
    expect(linkedOption.getAttribute("aria-disabled")).toBe("true");
    linkedOption.click();
    await submit(el);
    expect(addSceneProperty).not.toHaveBeenCalled();
    await chooseExisting(el, "available");
    await submit(el);
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledTimes(1);
    save.resolve({ data: { success: true, property: available } });
    await flush();
    expect(el.querySelectorAll("tbody tr")).toHaveLength(2);
    await openExistingOptions(el);
    const addedOption = existingOption(el, "available")!;
    expect(addedOption.getAttribute("aria-disabled")).toBe("true");
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledTimes(1);
  });

  it("retries a failed property catalog without reloading the scene properties", async () => {
    vi.mocked(getScenePropertyOptions)
      .mockRejectedValueOnce(new Error("catalog unavailable"))
      .mockResolvedValueOnce({
        data: [{ id: 2, key: "recovered", info: null }],
      } as never);
    const { el } = await mount();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      el.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled
    ).toBe(true);
    await submit(el);
    expect(addSceneProperty).not.toHaveBeenCalled();
    const retry = Array.from(el.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Retry")
    )!;
    retry.click();
    await flush();
    expect(getScenePropertyOptions).toHaveBeenCalledTimes(2);
    expect(getSceneProperties).toHaveBeenCalledTimes(1);
    await chooseExisting(el, "recovered");
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it("permits creating a property when only the existing-property catalog failed", async () => {
    vi.mocked(getScenePropertyOptions).mockRejectedValueOnce(
      new Error("catalog unavailable")
    );
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property: { id: 5, key: "new-key", info: null } },
    } as never);
    const { el, added } = await mount();
    await fill(el, "new-key");
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledWith(1, { key: "new-key" });
    expect(added).toHaveBeenCalledOnce();
  });

  it("ignores an old scene's catalog response after switching scenes", async () => {
    const oldCatalog = deferred<unknown>();
    vi.mocked(getScenePropertyOptions)
      .mockReturnValueOnce(oldCatalog.promise as never)
      .mockResolvedValueOnce({
        data: [{ id: 2, key: "current-option", info: null }],
      } as never);
    const { el, currentSceneId } = await mount();
    currentSceneId.value = 2;
    await flush();
    oldCatalog.resolve({ data: [{ id: 1, key: "old-option", info: null }] });
    await flush();
    await openExistingOptions(el);
    const optionText = existingOptions(el)
      .map((option) => option.textContent)
      .join(" ");
    expect(optionText).toContain("current-option");
    expect(optionText).not.toContain("old-option");
  });

  it("filters the existing-property library by key and description", async () => {
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [
        { id: 8, key: "weather", info: "Rain and wind" },
        { id: 9, key: "lighting", info: "Warm daylight" },
      ],
    } as never);
    const { el } = await mount();
    await openExistingOptions(el);
    const search = el.querySelector<HTMLInputElement>(
      ".scene-properties__select input"
    )!;
    expect(search).not.toBeNull();
    search.value = "DAYLIGHT";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(existingOption(el, "lighting")).toBeDefined();
    expect(existingOption(el, "weather")).toBeUndefined();
    search.value = "no-match";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(existingOptions(el)).toHaveLength(0);
    expect(
      el.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled
    ).toBe(true);
    expect(addSceneProperty).not.toHaveBeenCalled();
  });

  it("requires confirmation and permits cancelling without removing a property", async () => {
    const property = { id: 8, key: "weather", info: "Rain and wind" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    const { el, removed } = await mount(42);
    await clickButton(propertyRow(el, "weather"), "Remove");
    expect(removeSceneProperty).not.toHaveBeenCalled();
    expect(buttonWithText(el, "Confirm removal")).toBeDefined();
    await clickButton(el, "Cancel");
    expect(propertyRow(el, "weather")).toBeDefined();
    expect(el.textContent).not.toContain("Confirm removal");
    expect(removeSceneProperty).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
  });

  it("removes only the scene association and keeps the library property available to add again", async () => {
    const property = { id: 8, key: "weather", info: "Rain and wind" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(removeSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    const { el, removed } = await mount(42);
    await clickButton(propertyRow(el, "weather"), "Remove");
    await clickButton(el, "Confirm removal");
    expect(removeSceneProperty).toHaveBeenCalledTimes(1);
    expect(removeSceneProperty).toHaveBeenCalledWith(42, 8);
    expect(removed).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledWith(property);
    expect(el.querySelector("tbody")).toBeNull();
    await openExistingOptions(el);
    expect(
      existingOption(el, "weather")?.getAttribute("aria-disabled")
    ).not.toBe("true");
    expect(getScenePropertyOptions).toHaveBeenCalledTimes(1);
    await chooseExisting(el, "weather");
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledWith(42, { propertyId: 8 });
    expect(propertyRow(el, "weather")).toBeDefined();
  });

  it("keeps a newly created property available when an older catalog response arrives before removal", async () => {
    const catalog = deferred<{ data: SceneProperty[] }>();
    const property = {
      id: 18,
      key: "new-weather",
      info: "Created while loading",
    };
    vi.mocked(getScenePropertyOptions).mockReturnValueOnce(
      catalog.promise as never
    );
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    vi.mocked(removeSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    const { el } = await mount(42);
    await fill(el, property.key, property.info);
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledWith(42, {
      key: property.key,
      info: property.info,
    });
    expect(propertyRow(el, property.key)).toBeDefined();

    catalog.resolve({ data: [{ id: 3, key: "old-catalog-item", info: null }] });
    await flush();
    await clickButton(propertyRow(el, property.key), "Remove");
    await clickButton(el, "Confirm removal");
    await mode(el, "existing");
    await openExistingOptions(el);
    expect(existingOption(el, "old-catalog-item")).toBeDefined();
    const restoredOption = existingOption(el, property.key);
    expect(restoredOption).toBeDefined();
    expect(restoredOption!.getAttribute("aria-disabled")).not.toBe("true");
    await chooseExisting(el, property.key);
    await submit(el);
    expect(addSceneProperty).toHaveBeenLastCalledWith(42, {
      propertyId: property.id,
    });
    expect(addSceneProperty).toHaveBeenCalledTimes(2);
    expect(propertyRow(el, property.key)).toBeDefined();
    expect(getScenePropertyOptions).toHaveBeenCalledTimes(1);
  });

  it("warns that removing the public property makes the scene private", async () => {
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [{ id: 7, key: "public", info: null }],
    } as never);
    const { el } = await mount();
    await clickButton(propertyRow(el, "public"), "Remove");
    expect(el.textContent).toContain(
      "Removing this property makes the scene private."
    );
    expect(removeSceneProperty).not.toHaveBeenCalled();
  });

  it("keeps the associated row and confirmation after failure and permits retry", async () => {
    const property = { id: 8, key: "weather", info: "Rain and wind" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(removeSceneProperty)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: { success: true, property } } as never);
    const { el, removed } = await mount(42);
    await clickButton(propertyRow(el, "weather"), "Remove");
    await clickButton(el, "Confirm removal");
    expect(propertyRow(el, "weather")).toBeDefined();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(buttonWithText(el, "Confirm removal").disabled).toBe(false);
    expect(removed).not.toHaveBeenCalled();
    await clickButton(el, "Confirm removal");
    expect(removeSceneProperty).toHaveBeenCalledTimes(2);
    expect(removed).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledWith(property);
    expect(el.querySelector("tbody")).toBeNull();
  });

  it("blocks other mutations while removing and reports the busy state", async () => {
    const property = { id: 8, key: "weather", info: null };
    const other = { id: 9, key: "lighting", info: null };
    const available = { id: 10, key: "spawn", info: null };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property, other],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property, other, available],
    } as never);
    const removal = deferred<unknown>();
    vi.mocked(removeSceneProperty).mockReturnValueOnce(
      removal.promise as never
    );
    const { el, busyChange } = await mount();
    await chooseExisting(el, "spawn");
    await clickButton(propertyRow(el, "weather"), "Remove");
    await clickButton(el, "Confirm removal");
    expect(busyChange).toHaveBeenLastCalledWith(true);
    expect(buttonWithText(propertyRow(el, "lighting"), "Remove").disabled).toBe(
      true
    );
    expect(buttonWithText(el, "Confirm removal").disabled).toBe(true);
    expect(
      buttonWithText(propertyRow(el, "lighting"), "Delete property").disabled
    ).toBe(true);
    expect(
      el.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled
    ).toBe(true);
    await submit(el);
    await clickButton(el, "Confirm removal");
    expect(removeSceneProperty).toHaveBeenCalledTimes(1);
    expect(addSceneProperty).not.toHaveBeenCalled();
    removal.resolve({ data: { success: true, property } });
    await flush();
    expect(busyChange).toHaveBeenLastCalledWith(false);
  });

  it("ignores a late removal response after changing scenes", async () => {
    const oldProperty = { id: 8, key: "old-property", info: null };
    const currentProperty = { id: 9, key: "current-property", info: null };
    vi.mocked(getSceneProperties)
      .mockResolvedValueOnce({ data: [oldProperty] } as never)
      .mockResolvedValueOnce({ data: [currentProperty] } as never);
    const removal = deferred<unknown>();
    vi.mocked(removeSceneProperty).mockReturnValueOnce(
      removal.promise as never
    );
    const { el, currentSceneId, removed } = await mount();
    await clickButton(propertyRow(el, "old-property"), "Remove");
    await clickButton(el, "Confirm removal");
    currentSceneId.value = 2;
    await flush();
    removal.resolve({ data: { success: true, property: oldProperty } });
    await flush();
    expect(removed).not.toHaveBeenCalled();
    expect(propertyRow(el, "current-property")).toBeDefined();
    expect(el.textContent).not.toContain("Confirm removal");
  });

  it("hides root controls and ignores a late removal after permission is revoked", async () => {
    const property = { id: 8, key: "weather", info: null };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    const removal = deferred<unknown>();
    vi.mocked(removeSceneProperty).mockReturnValueOnce(
      removal.promise as never
    );
    const { el, removed } = await mount();
    await clickButton(propertyRow(el, "weather"), "Remove");
    await clickButton(el, "Confirm removal");
    permission.role = "user";
    await flush();
    removal.resolve({ data: { success: true, property } });
    await flush();
    expect(el.textContent).toBe("");
    expect(removed).not.toHaveBeenCalled();
  });

  it("loads the global impact count and requires acknowledgement before deletion", async () => {
    const property = prepareGlobalProperty();
    const usage = deferred<unknown>();
    vi.mocked(getScenePropertyUsage).mockReturnValueOnce(
      usage.promise as never
    );
    const { el, globallyDeleted } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    const panel = globalDeletePanel(el)!;
    expect(panel).not.toBeNull();
    expect(getScenePropertyUsage).toHaveBeenCalledWith(42, property.id);
    expect(panel.querySelector('[role="status"]')).not.toBeNull();
    expect(buttonWithText(panel, "Delete everywhere").disabled).toBe(true);
    buttonWithText(panel, "Delete everywhere").click();
    await flush();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();

    usage.resolve({ data: { property, sceneCount: 3 } });
    await flush();
    expect(globalDeletePanel(el)?.textContent).toContain("3");
    expect(globalDeletePanel(el)?.textContent?.toLowerCase()).toContain(
      "scene"
    );
    expect(
      buttonWithText(globalDeletePanel(el)!, "Delete everywhere").disabled
    ).toBe(true);
    await acknowledgeGlobalDeletion(el);
    expect(
      buttonWithText(globalDeletePanel(el)!, "Delete everywhere").disabled
    ).toBe(false);
    expect(globallyDeleted).not.toHaveBeenCalled();
    expect(removeSceneProperty).not.toHaveBeenCalled();
  });

  it("cancels a global deletion without deleting or unlinking the property", async () => {
    const property = prepareGlobalProperty();
    const { el } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Cancel");
    expect(globalDeletePanel(el)).toBeNull();
    expect(propertyRow(el, property.key)).toBeDefined();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
    expect(removeSceneProperty).not.toHaveBeenCalled();
  });

  it("cancels a pending impact lookup and ignores its late response", async () => {
    const property = prepareGlobalProperty();
    const usage = deferred<unknown>();
    vi.mocked(getScenePropertyUsage).mockReturnValueOnce(
      usage.promise as never
    );
    const { el, busyChange } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    expect(busyChange).toHaveBeenLastCalledWith(true);
    await clickButton(globalDeletePanel(el)!, "Cancel");
    expect(globalDeletePanel(el)).toBeNull();
    expect(busyChange).toHaveBeenLastCalledWith(false);
    usage.resolve({ data: { property, sceneCount: 99 } });
    await flush();
    expect(globalDeletePanel(el)).toBeNull();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
    expect(propertyRow(el, property.key)).toBeDefined();
  });

  it("retries an impact lookup failure before enabling global deletion", async () => {
    const property = prepareGlobalProperty();
    vi.mocked(getScenePropertyUsage)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: { property, sceneCount: 4 } } as never);
    const { el } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    expect(
      globalDeletePanel(el)?.querySelector('[role="alert"]')
    ).not.toBeNull();
    expect(
      buttonWithText(globalDeletePanel(el)!, "Delete everywhere").disabled
    ).toBe(true);
    await clickButton(globalDeletePanel(el)!, "Retry");
    expect(getScenePropertyUsage).toHaveBeenCalledTimes(2);
    expect(globalDeletePanel(el)?.textContent).toContain("4");
    await acknowledgeGlobalDeletion(el);
    expect(
      buttonWithText(globalDeletePanel(el)!, "Delete everywhere").disabled
    ).toBe(false);
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("globally deletes the property from both the current scene and the library", async () => {
    const property = prepareGlobalProperty();
    const other = { id: 9, key: "lighting", info: "Keep this one" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property, other],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property, other],
    } as never);
    const { el, globallyDeleted, removed } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    expect(deleteGlobalSceneProperty).toHaveBeenCalledTimes(1);
    expect(deleteGlobalSceneProperty).toHaveBeenCalledWith(42, property.id);
    expect(globallyDeleted).toHaveBeenCalledTimes(1);
    expect(globallyDeleted).toHaveBeenCalledWith(property);
    expect(removed).not.toHaveBeenCalled();
    expect(removeSceneProperty).not.toHaveBeenCalled();
    expect(globalDeletePanel(el)).toBeNull();
    expect(el.querySelector("tbody")?.textContent).not.toContain(property.key);
    expect(propertyRow(el, other.key)).toBeDefined();
    await openExistingOptions(el);
    expect(existingOption(el, property.key)).toBeUndefined();
    expect(existingOption(el, other.key)).toBeDefined();
  });

  it("globally deletes an unassociated selection and clears the selected library property", async () => {
    const property = prepareGlobalProperty();
    vi.mocked(getSceneProperties).mockResolvedValue({ data: [] } as never);
    const { el, globallyDeleted } = await mount(42);
    await chooseExisting(el, property.key);
    await clickButton(el, "Delete selected property");
    expect(getScenePropertyUsage).toHaveBeenCalledWith(42, property.id);
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    expect(globallyDeleted).toHaveBeenCalledWith(property);
    expect(
      el.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled
    ).toBe(true);
    await openExistingOptions(el);
    expect(existingOption(el, property.key)).toBeUndefined();
    await submit(el);
    expect(addSceneProperty).not.toHaveBeenCalled();
  });

  it("preserves the property and confirmation after a global delete failure and permits retry", async () => {
    const property = prepareGlobalProperty();
    vi.mocked(deleteGlobalSceneProperty)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        data: { success: true, property, affectedSceneCount: 3 },
      } as never);
    const { el, globallyDeleted } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    expect(propertyRow(el, property.key)).toBeDefined();
    expect(
      globalDeletePanel(el)?.querySelector('[role="alert"]')
    ).not.toBeNull();
    expect(globallyDeleted).not.toHaveBeenCalled();
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    expect(deleteGlobalSceneProperty).toHaveBeenCalledTimes(2);
    expect(globallyDeleted).toHaveBeenCalledTimes(1);
    expect(el.querySelector("tbody")).toBeNull();
  });

  it("warns that globally deleting public makes all affected scenes private", async () => {
    const property = prepareGlobalProperty({
      id: 7,
      key: "public",
      info: null,
    });
    const { el } = await mount();
    await clickButton(propertyRow(el, property.key), "Delete property");
    const warning = globalDeletePanel(el)?.textContent?.toLowerCase();
    expect(warning).toContain("private");
    expect(warning).toContain("scene");
    expect(warning).toContain("all");
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("ignores an old scene's late global impact response", async () => {
    const property = prepareGlobalProperty();
    const usage = deferred<unknown>();
    vi.mocked(getScenePropertyUsage).mockReturnValueOnce(
      usage.promise as never
    );
    const { el, currentSceneId, globallyDeleted } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    currentSceneId.value = 43;
    await flush();
    usage.resolve({ data: { property, sceneCount: 99 } });
    await flush();
    expect(globalDeletePanel(el)).toBeNull();
    expect(globallyDeleted).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("ignores a late global impact response after root permission is revoked", async () => {
    const property = prepareGlobalProperty();
    const usage = deferred<unknown>();
    vi.mocked(getScenePropertyUsage).mockReturnValueOnce(
      usage.promise as never
    );
    const { el, globallyDeleted } = await mount();
    await clickButton(propertyRow(el, property.key), "Delete property");
    permission.role = "user";
    await flush();
    usage.resolve({ data: { property, sceneCount: 99 } });
    await flush();
    expect(el.textContent).toBe("");
    expect(globallyDeleted).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it.each(["scene", "permission"])(
    "ignores a late global deletion after the %s context changes",
    async (context) => {
      const property = prepareGlobalProperty();
      const deletion = deferred<unknown>();
      vi.mocked(deleteGlobalSceneProperty).mockReturnValueOnce(
        deletion.promise as never
      );
      const { el, currentSceneId, globallyDeleted } = await mount(42);
      await clickButton(propertyRow(el, property.key), "Delete property");
      await acknowledgeGlobalDeletion(el);
      await clickButton(globalDeletePanel(el)!, "Delete everywhere");
      if (context === "scene") currentSceneId.value = 43;
      else permission.role = "user";
      await flush();
      deletion.resolve({
        data: { success: true, property, affectedSceneCount: 3 },
      });
      await flush();
      expect(globalDeletePanel(el)).toBeNull();
      expect(globallyDeleted).not.toHaveBeenCalled();
      if (context === "scene")
        expect(propertyRow(el, property.key)).toBeDefined();
      else expect(el.textContent).toBe("");
    }
  );

  it("blocks other scene mutations while deleting globally and reports busy state", async () => {
    const property = prepareGlobalProperty();
    const other = { id: 9, key: "lighting", info: null };
    const available = { id: 10, key: "spawn", info: null };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property, other],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property, other, available],
    } as never);
    const deletion = deferred<unknown>();
    vi.mocked(deleteGlobalSceneProperty).mockReturnValueOnce(
      deletion.promise as never
    );
    const { el, busyChange } = await mount();
    await chooseExisting(el, available.key);
    await clickButton(propertyRow(el, property.key), "Delete property");
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    expect(busyChange).toHaveBeenLastCalledWith(true);
    expect(buttonWithText(propertyRow(el, other.key), "Remove").disabled).toBe(
      true
    );
    expect(
      buttonWithText(propertyRow(el, other.key), "Delete property").disabled
    ).toBe(true);
    expect(
      el.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled
    ).toBe(true);
    await submit(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    expect(deleteGlobalSceneProperty).toHaveBeenCalledTimes(1);
    expect(removeSceneProperty).not.toHaveBeenCalled();
    expect(addSceneProperty).not.toHaveBeenCalled();
    deletion.resolve({
      data: { success: true, property, affectedSceneCount: 3 },
    });
    await flush();
    expect(busyChange).toHaveBeenLastCalledWith(false);
  });

  it("does not resurrect a globally deleted property from an earlier catalog response", async () => {
    const property = prepareGlobalProperty();
    const catalog = deferred<unknown>();
    vi.mocked(getScenePropertyOptions).mockReturnValueOnce(
      catalog.promise as never
    );
    const { el } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    catalog.resolve({ data: [property] });
    await flush();
    await openExistingOptions(el);
    expect(existingOption(el, property.key)).toBeUndefined();
  });

  it("allows admin to view and associate existing properties without root-only controls", async () => {
    permission.role = "admin";
    const linked = { id: 8, key: "weather", info: "Rain and wind" };
    const available = { id: 9, key: "lighting", info: "Warm daylight" };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [linked],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [linked, available],
    } as never);
    vi.mocked(addSceneProperty).mockResolvedValue({
      data: { success: true, property: available },
    } as never);
    const { el, added } = await mount(42);
    expect(getSceneProperties).toHaveBeenCalledWith(42);
    expect(getScenePropertyOptions).toHaveBeenCalledWith(42);
    expect(propertyRow(el, linked.key)).toBeDefined();
    expect(el.querySelector('input[value="new"]')).toBeNull();
    expect(el.querySelector(".scene-properties__form")).toBeNull();
    expect(el.textContent).not.toContain("Delete property");
    await chooseExisting(el, available.key);
    expect(el.textContent).not.toContain("Delete selected property");
    await submit(el);
    expect(addSceneProperty).toHaveBeenCalledTimes(1);
    expect(addSceneProperty).toHaveBeenCalledWith(42, {
      propertyId: available.id,
    });
    expect(added).toHaveBeenCalledWith(available);
    expect(propertyRow(el, available.key)).toBeDefined();
    expect(getScenePropertyUsage).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("allows admin to remove a current-scene association while retaining the library property", async () => {
    permission.role = "admin";
    const property = { id: 8, key: "weather", info: null };
    vi.mocked(getSceneProperties).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(getScenePropertyOptions).mockResolvedValue({
      data: [property],
    } as never);
    vi.mocked(removeSceneProperty).mockResolvedValue({
      data: { success: true, property },
    } as never);
    const { el, removed } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Remove");
    await clickButton(el, "Confirm removal");
    expect(removeSceneProperty).toHaveBeenCalledWith(42, property.id);
    expect(removed).toHaveBeenCalledWith(property);
    expect(el.querySelector("tbody")).toBeNull();
    await openExistingOptions(el);
    expect(existingOption(el, property.key)).toBeDefined();
    expect(
      existingOption(el, property.key)?.getAttribute("aria-disabled")
    ).not.toBe("true");
    expect(getScenePropertyUsage).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("hides property management and makes no property request for a manager", async () => {
    permission.role = "manager";
    const { el } = await mount();
    expect(el.textContent).toBe("");
    expect(getSceneProperties).not.toHaveBeenCalled();
    expect(getScenePropertyOptions).not.toHaveBeenCalled();
    expect(getScenePropertyUsage).not.toHaveBeenCalled();
    expect(addSceneProperty).not.toHaveBeenCalled();
    expect(removeSceneProperty).not.toHaveBeenCalled();
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
  });

  it("resets root-only creation state and ignores its response after switching to admin", async () => {
    const save = deferred<unknown>();
    const created = { id: 20, key: "root-created", info: null };
    vi.mocked(addSceneProperty).mockReturnValueOnce(save.promise as never);
    const { el, added } = await mount(42);
    await fill(el, created.key);
    await submit(el);
    permission.role = "admin";
    await flush();
    save.resolve({ data: { success: true, property: created } });
    await flush();
    expect(el.querySelector(".scene-properties")).not.toBeNull();
    expect(el.querySelector('input[value="new"]')).toBeNull();
    expect(el.querySelector(".scene-properties__form")).toBeNull();
    expect(el.querySelector("tbody")?.textContent ?? "").not.toContain(
      created.key
    );
    expect(added).not.toHaveBeenCalled();
    expect(getSceneProperties).toHaveBeenCalledTimes(2);
    expect(getScenePropertyOptions).toHaveBeenCalledTimes(2);
  });

  it("resets root-only global impact lookup and ignores its response after switching to admin", async () => {
    const property = prepareGlobalProperty();
    const usage = deferred<unknown>();
    vi.mocked(getScenePropertyUsage).mockReturnValueOnce(
      usage.promise as never
    );
    const { el, globallyDeleted } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    permission.role = "admin";
    await flush();
    usage.resolve({ data: { property, sceneCount: 99 } });
    await flush();
    expect(globalDeletePanel(el)).toBeNull();
    expect(propertyRow(el, property.key)).toBeDefined();
    expect(el.textContent).not.toContain("Delete property");
    expect(deleteGlobalSceneProperty).not.toHaveBeenCalled();
    expect(globallyDeleted).not.toHaveBeenCalled();
  });

  it("ignores a root-only global deletion response after switching to admin", async () => {
    const property = prepareGlobalProperty();
    const deletion = deferred<unknown>();
    vi.mocked(deleteGlobalSceneProperty).mockReturnValueOnce(
      deletion.promise as never
    );
    const { el, globallyDeleted } = await mount(42);
    await clickButton(propertyRow(el, property.key), "Delete property");
    await acknowledgeGlobalDeletion(el);
    await clickButton(globalDeletePanel(el)!, "Delete everywhere");
    permission.role = "admin";
    await flush();
    deletion.resolve({
      data: { success: true, property, affectedSceneCount: 3 },
    });
    await flush();
    expect(globalDeletePanel(el)).toBeNull();
    expect(propertyRow(el, property.key)).toBeDefined();
    expect(el.textContent).not.toContain("Delete property");
    expect(globallyDeleted).not.toHaveBeenCalled();
  });
});
