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
    }),
  };
});

vi.mock("@/components/MrPP/MrPPUpload/index.vue", async () => {
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
    }),
  };
});

const cleanups: (() => void)[] = [];

beforeEach(() => {
  triggerSaveResource = null;
  pushMock.mockReset();
  postPolygenMock.mockReset();
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
});

async function mount() {
  const { default: UploadView } = await import("@/views/polygen/upload.vue");
  const el = document.createElement("div");
  const app = createApp(UploadView as Parameters<typeof createApp>[0]);
  app.config.globalProperties.$t = (k: string) => k;
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

async function flush() {
  await Promise.resolve();
  await nextTick();
}

describe("views/polygen/upload.vue", () => {
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
      path: "/resource/polygen/view",
      query: { id: 202 },
    });
  });

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
  });
});
