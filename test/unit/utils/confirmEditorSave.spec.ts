import { afterEach, describe, expect, it, vi } from "vitest";
import { reactive, ref } from "vue";
import { confirmEditorSave } from "@/utils/confirmEditorSave";
import { useSceneSaveGuard } from "@/composables/useSceneSaveGuard";

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock("element-plus", () => ({ ElMessageBox: { confirm } }));
afterEach(() => vi.clearAllMocks());

type BeforeClose = NonNullable<
  Parameters<typeof confirmEditorSave>[1]["beforeClose"]
>;

function setup() {
  const state = reactive({ loading: true, blocked: true });
  let beforeClose!: BeforeClose;
  let resolve!: (action: string) => void;
  let reject!: (action: string) => void;
  confirm.mockImplementation((_message, _title, options) => {
    beforeClose = options.beforeClose;
    return new Promise<string>((success, failure) => {
      resolve = success;
      reject = failure;
    });
  });
  const instance = {
    confirmButtonLoading: false,
    confirmButtonDisabled: false,
  } as Parameters<BeforeClose>[1];
  const press = (action: "confirm" | "cancel" | "close") => {
    const done = vi.fn(() =>
      action === "confirm" ? resolve(action) : reject(action)
    );
    beforeClose(action, instance, done);
    return done;
  };
  const isSavingVersion = ref(false);
  const sendRequest = vi.fn(() => "request-id");
  const onBeforeSave = vi.fn();
  const dialog = () => confirmEditorSave("Save changes?", {}, () => state);
  const guard = useSceneSaveGuard({
    sendRequest,
    pendingRequests: new Map(),
    pendingRestorePayload: ref({ verse: {} }),
    isSavingVersion,
    isEditorReady: () => !state.blocked,
    confirmDialog: dialog,
    onBeforeSave,
  });
  const ready = () => Object.assign(state, { loading: false, blocked: false });
  return {
    state,
    instance,
    press,
    guard,
    dialog,
    ready,
    sendRequest,
    isSavingVersion,
    onBeforeSave,
  };
}

describe("leaving while the restored editor is loading", () => {
  it("waits for readiness after Save, then sends exactly one save request", async () => {
    const context = setup();
    const leaving = context.guard.resolveUnsavedBeforeLeave();
    await Promise.resolve();
    expect(confirm).toHaveBeenCalledOnce();
    expect(context.sendRequest).not.toHaveBeenCalled();
    const done = context.press("confirm");
    expect(done).not.toHaveBeenCalled();
    expect(context.instance).toMatchObject({
      confirmButtonLoading: true,
      confirmButtonDisabled: true,
    });
    context.ready();
    await vi.waitFor(() =>
      expect(context.sendRequest).toHaveBeenCalledWith("save-before-leave")
    );
    expect(done).toHaveBeenCalledOnce();
    expect(context.sendRequest).toHaveBeenCalledOnce();
    context.guard.resolveLeaveSave(true);
    expect(await leaving).toBe(true);
    expect(context.isSavingVersion.value).toBe(false);
  });

  it.each(["cancel", "close"] as const)(
    "allows %s during the wait without any later save",
    async (action) => {
      const context = setup();
      const leaving = context.guard.resolveUnsavedBeforeLeave();
      await Promise.resolve();
      const saveDone = context.press("confirm");
      const cancelDone = context.press(action);
      expect(await leaving).toBe(action === "cancel");
      expect(cancelDone).toHaveBeenCalledOnce();
      context.ready();
      await Promise.resolve();
      expect(saveDone).not.toHaveBeenCalled();
      expect(context.sendRequest).not.toHaveBeenCalled();
    }
  );

  it("keeps failed loading blocked without an endlessly spinning Save button", async () => {
    const context = setup();
    const leaving = context.guard.resolveUnsavedBeforeLeave();
    await Promise.resolve();
    context.press("confirm");
    context.state.loading = false;
    expect(context.instance).toMatchObject({
      confirmButtonLoading: false,
      confirmButtonDisabled: true,
    });
    expect(context.sendRequest).not.toHaveBeenCalled();
    context.press("close");
    expect(await leaving).toBe(false);
  });

  it("rechecks readiness if loading restarts between the dialog result and saving", async () => {
    const context = setup();
    const leaving = context.guard.resolveUnsavedBeforeLeave();
    await Promise.resolve();
    context.press("confirm");
    context.ready();
    Object.assign(context.state, { loading: true, blocked: true });
    expect(await leaving).toBe(false);
    expect(context.sendRequest).not.toHaveBeenCalled();
    expect(context.onBeforeSave).not.toHaveBeenCalled();
    expect(context.isSavingVersion.value).toBe(false);
  });

  it("does not treat loading completion as a user's Save choice", async () => {
    const context = setup();
    const dialog = context.dialog();
    context.ready();
    expect(context.sendRequest).not.toHaveBeenCalled();
    context.press("cancel");
    await expect(dialog).rejects.toBe("cancel");
  });

  it("preserves normal confirmation when the editor is already ready", async () => {
    const context = setup();
    context.ready();
    const dialog = context.dialog();
    expect(context.press("confirm")).toHaveBeenCalledOnce();
    await expect(dialog).resolves.toBe("confirm");
    expect(context.instance.confirmButtonLoading).toBe(false);
  });

  it("rejects direct save requests while loading without calling the iframe or mutating saving state", async () => {
    const context = setup();
    expect(await context.guard.requestSceneSave("manual")).toBe(false);
    expect(await context.guard.queryUnsavedChangesBeforeLeave()).toBe(true);
    expect(context.sendRequest).not.toHaveBeenCalled();
    expect(context.onBeforeSave).not.toHaveBeenCalled();
    expect(context.isSavingVersion.value).toBe(false);
  });
});
