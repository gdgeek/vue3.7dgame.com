<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick } from "vue";

const mockPostPolygen = vi.fn();
const mockRouterPush = vi.fn();

const saveArgs = {
  name: "polygen-a",
  fileId: 101,
  totalFiles: 1,
  callback: vi.fn(),
};

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/api/v1/resources/index", () => ({
  postPolygen: mockPostPolygen,
}));

vi.mock("@/components/TransitionWrapper.vue", async () => {
  const { defineComponent } = await import("vue");
  return {
    default: defineComponent({
      name: "TransitionWrapperStub",
      template: "<div class='transition-wrapper-stub'><slot /></div>",
=======
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";

const pushMock = vi.fn();
const postPolygenMock = vi.fn();
let triggerSaveResource:
  | ((
      name: string,
      fileId: number,
      totalFiles: number,
      callback: () => void
    ) => void)
  | null = null;

vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
  })),
}));

vi.mock("@/api/v1/resources/index", () => ({
  postPolygen: (...args: unknown[]) => postPolygenMock(...args),
}));

vi.mock("@/components/TransitionWrapper.vue", async () => {
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "TransitionWrapper",
      setup(_, { slots }) {
        return () => vh("div", { class: "transition-wrapper-stub" }, slots.default?.());
      },
>>>>>>> openclaw/improvements
    }),
  };
});

vi.mock("@/components/MrPP/MrPPUpload/index.vue", async () => {
<<<<<<< HEAD
  const { defineComponent } = await import("vue");
  return {
    default: defineComponent({
      name: "MrPPUploadStub",
      props: {
        dir: { type: String, default: "" },
        fileType: { type: String, default: "" },
        maxSize: { type: Number, default: 0 },
      },
      emits: ["save-resource"],
      methods: {
        triggerSave() {
          this.$emit(
            "save-resource",
            saveArgs.name,
            saveArgs.fileId,
            saveArgs.totalFiles,
            saveArgs.callback
          );
        },
      },
      template:
        "<div class='mrpp-upload-stub' :data-dir='dir' :data-file-type='fileType' :data-max-size='maxSize'><slot /><button class='emit-save' @click='triggerSave'>save</button></div>",
=======
  const { defineComponent: dc, h: vh } = await import("vue");
  return {
    default: dc({
      name: "MrPPUpload",
      props: {
        dir: {
          type: String,
          default: "",
        },
        fileType: {
          type: String,
          default: "",
        },
        maxSize: {
          type: Number,
          default: 0,
        },
      },
      emits: ["save-resource"],
      setup(props, { emit, slots }) {
        triggerSaveResource = (
          name: string,
          fileId: number,
          totalFiles: number,
          callback: () => void
        ) => {
          emit("save-resource", name, fileId, totalFiles, callback);
        };

        return () =>
          vh(
            "div",
            {
              class: "mrpp-upload-stub",
              "data-dir": String(props.dir ?? ""),
              "data-file-type": String(props.fileType ?? ""),
              "data-max-size": String(props.maxSize ?? ""),
            },
            slots.default?.()
          );
      },
>>>>>>> openclaw/improvements
    }),
  };
});

<<<<<<< HEAD
const cleanups: Array<() => void> = [];

beforeEach(() => {
  mockPostPolygen.mockReset();
  mockRouterPush.mockReset();
  saveArgs.name = "polygen-a";
  saveArgs.fileId = 101;
  saveArgs.totalFiles = 1;
  saveArgs.callback = vi.fn();
=======
const cleanups: (() => void)[] = [];

beforeEach(() => {
  triggerSaveResource = null;
  pushMock.mockReset();
  postPolygenMock.mockReset();
>>>>>>> openclaw/improvements
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
<<<<<<< HEAD
  vi.resetModules();
});

async function mountView() {
  const { default: UploadView } = await import("@/views/polygen/upload.vue");
  const el = document.createElement("div");
  const app = createApp(UploadView as Parameters<typeof createApp>[0]);
  app.config.globalProperties.$t = (key: string) => key;
=======
});

async function mount() {
  const { default: UploadView } = await import("@/views/polygen/upload.vue");
  const el = document.createElement("div");
  const app = createApp(UploadView as Parameters<typeof createApp>[0]);
  app.config.globalProperties.$t = (k: string) => k;
>>>>>>> openclaw/improvements
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

<<<<<<< HEAD
async function clickSave(el: HTMLElement) {
  const btn = el.querySelector(".emit-save") as HTMLButtonElement | null;
  expect(btn).not.toBeNull();
  btn?.dispatchEvent(new MouseEvent("click"));
=======
async function flush() {
>>>>>>> openclaw/improvements
  await Promise.resolve();
  await nextTick();
}

describe("views/polygen/upload.vue", () => {
<<<<<<< HEAD
  it("renders upload slot text and file type prop", async () => {
    const { el } = await mountView();
    expect(el.textContent).toContain("polygen.uploadFile");
    const upload = el.querySelector(".mrpp-upload-stub");
    expect(upload?.getAttribute("data-file-type")).toBe(".glb");
  });

  it("calls postPolygen and callback for one upload", async () => {
    mockPostPolygen.mockResolvedValue({ data: { id: 101 } });
    const { el } = await mountView();

    await clickSave(el);

    expect(mockPostPolygen).toHaveBeenCalledWith({
      name: "polygen-a",
      file_id: 101,
    });
    expect(saveArgs.callback).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith({
      path: "/resource/polygen/view",
      query: { id: 101 },
    });
  });

  it("navigates only after completed uploads reaches totalFiles", async () => {
    saveArgs.totalFiles = 2;
    mockPostPolygen.mockResolvedValueOnce({ data: { id: 201 } });
    mockPostPolygen.mockResolvedValueOnce({ data: { id: 202 } });
    const { el } = await mountView();

    await clickSave(el);
    expect(mockRouterPush).not.toHaveBeenCalled();

    saveArgs.fileId = 202;
    await clickSave(el);
    expect(mockRouterPush).toHaveBeenCalledWith({
=======
  it("mounts and renders upload slot text", async () => {
    const { el } = await mount();
    expect(el.querySelector(".transition-wrapper-stub")).not.toBeNull();
    expect(el.textContent).toContain("polygen.uploadFile");
  });

  it("passes upload props to MrPPUpload", async () => {
    const { el } = await mount();
    const upload = el.querySelector(".mrpp-upload-stub");

    expect(upload?.getAttribute("data-dir")).toBe("polygen");
    expect(upload?.getAttribute("data-file-type")).toBe(".glb");
    expect(upload?.getAttribute("data-max-size")).toBe("100");
  });

  it("calls postPolygen and callback when save-resource is emitted", async () => {
    postPolygenMock.mockResolvedValue({ data: { id: 101 } });
    const callback = vi.fn();

    await mount();
    triggerSaveResource?.("model.glb", 7, 2, callback);
    await flush();

    expect(postPolygenMock).toHaveBeenCalledWith({ name: "model.glb", file_id: 7 });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to view page after all files uploaded", async () => {
    postPolygenMock
      .mockResolvedValueOnce({ data: { id: 101 } })
      .mockResolvedValueOnce({ data: { id: 202 } });
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    await mount();
    triggerSaveResource?.("a.glb", 1, 2, cb1);
    await flush();
    triggerSaveResource?.("b.glb", 2, 2, cb2);
    await flush();

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith({
>>>>>>> openclaw/improvements
      path: "/resource/polygen/view",
      query: { id: 202 },
    });
  });

<<<<<<< HEAD
  it("always calls callback when postPolygen fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPostPolygen.mockRejectedValue(new Error("upload failed"));
    const { el } = await mountView();

    await clickSave(el);

    expect(saveArgs.callback).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
    consoleError.mockRestore();
=======
  it("still calls callback when postPolygen fails", async () => {
    postPolygenMock.mockRejectedValue(new Error("upload failed"));
    const callback = vi.fn();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await mount();
    triggerSaveResource?.("broken.glb", 9, 1, callback);
    await flush();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
>>>>>>> openclaw/improvements
  });
});
