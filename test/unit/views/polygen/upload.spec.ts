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
    }),
  };
});

vi.mock("@/components/MrPP/MrPPUpload/index.vue", async () => {
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
    }),
  };
});

const cleanups: Array<() => void> = [];

beforeEach(() => {
  mockPostPolygen.mockReset();
  mockRouterPush.mockReset();
  saveArgs.name = "polygen-a";
  saveArgs.fileId = 101;
  saveArgs.totalFiles = 1;
  saveArgs.callback = vi.fn();
});

afterEach(() => {
  cleanups.forEach((fn) => fn());
  cleanups.length = 0;
  vi.resetModules();
});

async function mountView() {
  const { default: UploadView } = await import("@/views/polygen/upload.vue");
  const el = document.createElement("div");
  const app = createApp(UploadView as Parameters<typeof createApp>[0]);
  app.config.globalProperties.$t = (key: string) => key;
  app.mount(el);
  cleanups.push(() => app.unmount());
  await nextTick();
  return { el };
}

async function clickSave(el: HTMLElement) {
  const btn = el.querySelector(".emit-save") as HTMLButtonElement | null;
  expect(btn).not.toBeNull();
  btn?.dispatchEvent(new MouseEvent("click"));
  await Promise.resolve();
  await nextTick();
}

describe("views/polygen/upload.vue", () => {
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
      path: "/resource/polygen/view",
      query: { id: 202 },
    });
  });

  it("always calls callback when postPolygen fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPostPolygen.mockRejectedValue(new Error("upload failed"));
    const { el } = await mountView();

    await clickSave(el);

    expect(saveArgs.callback).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
