/**
 * Unit tests for src/utils/downloadHelper.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));
vi.mock("element-plus", () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
}));

describe("downloadResource()", () => {
  let elMessage: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };
  let loggerMod: { logger: { error: ReturnType<typeof vi.fn> } };
  let downloadResource: typeof import("@/utils/downloadHelper").downloadResource;

  const mockT = (key: string) => `[${key}]`;
  const PREFIX = "test.download";

  beforeEach(async () => {
    vi.clearAllMocks();

    const epModule = (await import("element-plus")) as unknown as {
      ElMessage: typeof elMessage;
    };
    elMessage = epModule.ElMessage;
    loggerMod = await import("@/utils/logger");
    ({ downloadResource } = await import("@/utils/downloadHelper"));

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["data"], { type: "model/gltf-binary" })),
    });

    // jsdom doesn't implement URL object URL methods — define them
    URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    URL.revokeObjectURL = vi.fn();

    // Suppress jsdom "Not implemented: navigation" warning from link.click()
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns early and shows ElMessage.error when resource is null", async () => {
    await downloadResource(null as never, ".glb", mockT, PREFIX);
    expect(elMessage.error).toHaveBeenCalledWith(`[${PREFIX}.error]`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns early and shows ElMessage.error when resource.file is missing", async () => {
    await downloadResource({ name: "model" } as never, ".glb", mockT, PREFIX);
    expect(elMessage.error).toHaveBeenCalledWith(`[${PREFIX}.error]`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls fetch with the resource file URL", async () => {
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(global.fetch).toHaveBeenCalledWith("https://cdn.example.com/model.glb");
  });

  it("calls URL.createObjectURL with the blob from fetch", async () => {
    const mockBlob = new Blob(["data"]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      blob: vi.fn().mockResolvedValue(mockBlob),
    });
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(URL.createObjectURL as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(mockBlob);
  });

  it("calls URL.revokeObjectURL with the blob URL after download", async () => {
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(URL.revokeObjectURL as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows ElMessage.success on successful download", async () => {
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(elMessage.success).toHaveBeenCalledWith(`[${PREFIX}.success]`);
  });

  it("appends file extension to download filename when missing", async () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe("my-model.glb");
  });

  it("does NOT duplicate extension when fileName already ends with it", async () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const resource = { name: "my-model.glb", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe("my-model.glb");
    expect(link.download).not.toBe("my-model.glb.glb");
  });

  it("uses 'download' as fallback filename when name is empty", async () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const resource = { name: "", file: { url: "https://cdn.example.com/x.mp3" } };
    await downloadResource(resource, ".mp3", mockT, PREFIX);
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe("download.mp3");
  });

  it("calls logger.error and shows ElMessage.error on fetch failure", async () => {
    const fetchError = new Error("Network failure");
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(fetchError);
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(loggerMod.logger.error).toHaveBeenCalledWith(fetchError);
    expect(elMessage.error).toHaveBeenCalled();
  });

  it("sets link href to the blob URL", async () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.href).toBe("blob:mock-url");
  });

  it("creates link via document.createElement('a')", async () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(createElementSpy).toHaveBeenCalledWith("a");
  });

  it("link is removed from DOM via removeChild after download", async () => {
    const removeChildSpy = vi.spyOn(document.body, "removeChild");
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it("link.click() is called exactly once on successful download", async () => {
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    const clickSpy = vi.mocked(HTMLAnchorElement.prototype.click);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("URL.createObjectURL is called exactly once per download", async () => {
    const resource = { name: "my-model", file: { url: "https://cdn.example.com/model.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(URL.createObjectURL as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
  });

  it("does not show ElMessage.success on fetch failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));
    const resource = { name: "x", file: { url: "https://cdn.example.com/x.glb" } };
    await downloadResource(resource, ".glb", mockT, PREFIX);
    expect(elMessage.success).not.toHaveBeenCalled();
  });
});
