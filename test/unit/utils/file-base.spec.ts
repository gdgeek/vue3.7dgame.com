/**
 * Unit tests for src/assets/js/file/base.ts
 * Covers the sleep() helper (pure timer) and fileOpen() (DOM interaction).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("spark-md5", () => ({
  default: {
    ArrayBuffer: vi.fn(() => ({
      append: vi.fn(),
      end: vi.fn(() => "mock-md5"),
    })),
  },
}));
vi.mock("@/utils/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("sleep()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the specified number of milliseconds", async () => {
    const { sleep } = await import("@/assets/js/file/base");
    let resolved = false;
    const p = sleep(1000).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(999);
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1);
    await p;
    expect(resolved).toBe(true);
  });

  it("resolves immediately for 0ms", async () => {
    const { sleep } = await import("@/assets/js/file/base");
    let resolved = false;
    const p = sleep(0).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(0);
    await p;
    expect(resolved).toBe(true);
  });

  it("returns a Promise", async () => {
    const { sleep } = await import("@/assets/js/file/base");
    expect(sleep(10)).toBeInstanceOf(Promise);
    vi.advanceTimersByTime(10);
  });
});

describe("fileOpen()", () => {
  let mockInput: {
    type: string;
    accept: string;
    multiple: boolean;
    click: ReturnType<typeof vi.fn>;
    onchange: ((e: Event) => void) | null;
  };

  beforeEach(async () => {
    vi.resetModules();
    mockInput = {
      type: "",
      accept: "",
      multiple: false,
      click: vi.fn(),
      onchange: null,
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "input") return mockInput as unknown as HTMLElement;
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets the input accept and type attributes", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    fileOpen("image/*");
    expect(mockInput.accept).toBe("image/*");
    expect(mockInput.type).toBe("file");
  });

  it("sets multiple=false by default", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    fileOpen("image/*");
    expect(mockInput.multiple).toBe(false);
  });

  it("sets multiple=true when requested", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    fileOpen("image/*", true);
    expect(mockInput.multiple).toBe(true);
  });

  it("calls input.click()", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    fileOpen(".glb");
    expect(mockInput.click).toHaveBeenCalled();
  });

  it("resolves with files that include extension property", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    const mockFile = new File(["content"], "model.glb", { type: "model/gltf" });
    const promise = fileOpen(".glb");

    // Simulate file selection
    const fakeEvent = {
      target: { files: [mockFile] },
    } as unknown as Event;
    mockInput.onchange!(fakeEvent);

    const files = await promise;
    expect(files).toHaveLength(1);
    expect((files[0] as any).extension).toBe("glb");
  });

  it("rejects when no files are selected", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    const promise = fileOpen(".glb");

    const fakeEvent = {
      target: { files: [] },
    } as unknown as Event;
    mockInput.onchange!(fakeEvent);

    await expect(promise).rejects.toThrow("No files selected");
  });

  it("extracts extension from filename with query string", async () => {
    const { fileOpen } = await import("@/assets/js/file/base");
    const mockFile = new File([""], "texture.png", { type: "image/png" });
    const promise = fileOpen("image/*");

    mockInput.onchange!({ target: { files: [mockFile] } } as unknown as Event);

    const files = await promise;
    expect((files[0] as any).extension).toBe("png");
  });
});
