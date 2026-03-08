import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/v1/scene-package", () => ({
  postVerseImportZip: vi.fn(),
}));

import { importScene } from "@/services/scene-package/import-service";
import { postVerseImportZip } from "@/api/v1/scene-package";

describe("scene package import-service batch1", () => {
  const zipFile = new File(["zip-content"], "scene.zip", {
    type: "application/zip",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with returned verseId", async () => {
    vi.mocked(postVerseImportZip).mockResolvedValue({
      data: { verseId: 321 },
    } as never);

    const result = await importScene(zipFile);

    expect(result).toEqual({ success: true, verseId: 321 });
  });

  it("passes original file object to API", async () => {
    vi.mocked(postVerseImportZip).mockResolvedValue({
      data: { verseId: 1 },
    } as never);

    await importScene(zipFile);

    expect(postVerseImportZip).toHaveBeenCalledWith(zipFile);
    expect(postVerseImportZip).toHaveBeenCalledTimes(1);
  });

  it("keeps success=true even when verseId is zero", async () => {
    vi.mocked(postVerseImportZip).mockResolvedValue({
      data: { verseId: 0 },
    } as never);

    const result = await importScene(zipFile);

    expect(result).toEqual({ success: true, verseId: 0 });
  });

  it("returns message from thrown Error", async () => {
    vi.mocked(postVerseImportZip).mockRejectedValue(new TypeError("bad zip"));

    const result = await importScene(zipFile);

    expect(result).toEqual({
      success: false,
      verseId: 0,
      error: "bad zip",
    });
  });

  it("returns default error for non-Error throws", async () => {
    vi.mocked(postVerseImportZip).mockRejectedValue({ detail: "unknown" });

    const result = await importScene(zipFile);

    expect(result).toEqual({
      success: false,
      verseId: 0,
      error: "导入失败，请重试",
    });
  });

  it("returns empty error string when Error message is empty", async () => {
    vi.mocked(postVerseImportZip).mockRejectedValue(new Error(""));

    const result = await importScene(zipFile);

    expect(result).toEqual({
      success: false,
      verseId: 0,
      error: "",
    });
  });
});
