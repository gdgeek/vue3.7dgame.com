import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock the API module
vi.mock("@/api/v1/scene-package", () => ({
  getVerseExportZip: vi.fn(),
  postVerseImportZip: vi.fn(),
}));

import {
  extractFilename,
  exportScene,
} from "@/services/scene-package/export-service";
import { importScene } from "@/services/scene-package/import-service";
import { getVerseExportZip, postVerseImportZip } from "@/api/v1/scene-package";

// ============================================================
// extractFilename - Unit Tests
// ============================================================
describe("extractFilename", () => {
  it("should extract filename from Content-Disposition with quotes", () => {
    const result = extractFilename('attachment; filename="scene_626.zip"', 1);
    expect(result).toBe("scene_626.zip");
  });

  it("should extract filename from Content-Disposition without quotes", () => {
    const result = extractFilename("attachment; filename=scene_626.zip", 1);
    expect(result).toBe("scene_626.zip");
  });

  it("should return fallback when Content-Disposition is undefined", () => {
    const result = extractFilename(undefined, 42);
    expect(result).toBe("scene_42.zip");
  });

  it("should return fallback when Content-Disposition has no filename", () => {
    const result = extractFilename("attachment; other=value", 99);
    expect(result).toBe("scene_99.zip");
  });

  it("should return fallback when Content-Disposition is empty string", () => {
    const result = extractFilename("", 7);
    expect(result).toBe("scene_7.zip");
  });
});

// ============================================================
// extractFilename - Property-Based Tests
// **Validates: Requirements 2.2, 2.3**
// ============================================================
describe("extractFilename - property tests", () => {
  it("should return scene_{id}.zip for any positive integer when Content-Disposition is undefined", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1 }), (id) => {
        const result = extractFilename(undefined, id);
        expect(result).toBe(`scene_${id}.zip`);
      })
    );
  });

  it('should extract xxx.zip from any Content-Disposition containing filename="xxx.zip"', () => {
    // Generate a valid filename: alphanumeric + underscores, non-empty, ending with .zip
    const filenameBaseArb = fc
      .array(
        fc.constantFrom(
          ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split(
            ""
          )
        ),
        { minLength: 1, maxLength: 30 }
      )
      .map((chars) => chars.join(""));

    fc.assert(
      fc.property(filenameBaseArb, (base) => {
        const filename = `${base}.zip`;
        const header = `attachment; filename="${filename}"`;
        const result = extractFilename(header, 0);
        expect(result).toBe(filename);
      })
    );
  });
});

// ============================================================
// exportScene - Unit Tests (mock getVerseExportZip)
// ============================================================
describe("exportScene", () => {
  const mockClick = vi.fn();
  let mockLink: { href: string; download: string; click: typeof mockClick };
  const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockLink = { href: "", download: "", click: mockClick };

    vi.spyOn(document, "createElement").mockReturnValue(
      mockLink as unknown as HTMLElement
    );
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  it("should call getVerseExportZip with the correct verseId", async () => {
    const mockResponse = {
      data: new Blob(["zip-content"]),
      headers: {
        "content-disposition": 'attachment; filename="scene_100.zip"',
      },
    };
    vi.mocked(getVerseExportZip).mockResolvedValue(mockResponse as never);

    await exportScene(100);

    expect(getVerseExportZip).toHaveBeenCalledWith(100);
  });

  it("should trigger browser download with correct filename from Content-Disposition", async () => {
    const mockResponse = {
      data: new Blob(["zip-content"]),
      headers: { "content-disposition": 'attachment; filename="my_scene.zip"' },
    };
    vi.mocked(getVerseExportZip).mockResolvedValue(mockResponse as never);

    await exportScene(1);

    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(mockLink.download).toBe("my_scene.zip");
    expect(mockLink.href).toBe("blob:mock-url");
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("should return { success: true } on successful export", async () => {
    const mockResponse = {
      data: new Blob(["zip-content"]),
      headers: { "content-disposition": 'attachment; filename="scene_5.zip"' },
    };
    vi.mocked(getVerseExportZip).mockResolvedValue(mockResponse as never);

    const result = await exportScene(5);

    expect(result).toEqual({ success: true });
  });
});

// ============================================================
// importScene - Unit Tests (mock postVerseImportZip)
// ============================================================
describe("importScene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call postVerseImportZip with the file", async () => {
    const mockFile = new File(["content"], "scene.zip", {
      type: "application/zip",
    });
    const mockResponse = {
      data: { verseId: 42, metaIdMap: {}, resourceIdMap: {} },
    };
    vi.mocked(postVerseImportZip).mockResolvedValue(mockResponse as never);

    await importScene(mockFile);

    expect(postVerseImportZip).toHaveBeenCalledWith(mockFile);
  });

  it("should return { success: true, verseId } on success", async () => {
    const mockFile = new File(["content"], "scene.zip", {
      type: "application/zip",
    });
    const mockResponse = {
      data: { verseId: 123, metaIdMap: {}, resourceIdMap: {} },
    };
    vi.mocked(postVerseImportZip).mockResolvedValue(mockResponse as never);

    const result = await importScene(mockFile);

    expect(result).toEqual({ success: true, verseId: 123 });
  });

  it("should return { success: false, error } when API throws an Error", async () => {
    const mockFile = new File(["content"], "scene.zip", {
      type: "application/zip",
    });
    vi.mocked(postVerseImportZip).mockRejectedValue(new Error("Network Error"));

    const result = await importScene(mockFile);

    expect(result).toEqual({
      success: false,
      verseId: 0,
      error: "Network Error",
    });
  });

  it('should return { success: false, error: "导入失败，请重试" } when API throws a non-Error', async () => {
    const mockFile = new File(["content"], "scene.zip", {
      type: "application/zip",
    });
    vi.mocked(postVerseImportZip).mockRejectedValue("some string error");

    const result = await importScene(mockFile);

    expect(result).toEqual({
      success: false,
      verseId: 0,
      error: "导入失败，请重试",
    });
  });
});
