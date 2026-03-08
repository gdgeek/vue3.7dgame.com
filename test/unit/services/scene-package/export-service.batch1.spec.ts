import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/v1/scene-package", () => ({
  getVerseExportZip: vi.fn(),
}));

import {
  extractFilename,
  exportScene,
} from "@/services/scene-package/export-service";
import { getVerseExportZip } from "@/api/v1/scene-package";

describe("scene package export-service batch1", () => {
  const mockClick = vi.fn();
  const mockCreateObjectURL = vi.fn(() => "blob:batch1-url");
  const mockRevokeObjectURL = vi.fn();
  let mockLink: { href: string; download: string; click: () => void };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLink = { href: "", download: "", click: mockClick };
    vi.spyOn(document, "createElement").mockReturnValue(
      mockLink as unknown as HTMLElement
    );
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  it("extracts filename when header has trailing parameters", () => {
    const header = 'attachment; filename="scene_900.zip"; size=1024';
    expect(extractFilename(header, 1)).toBe("scene_900.zip");
  });

  it("falls back when header contains an empty filename", () => {
    const header = 'attachment; filename=""';
    expect(extractFilename(header, 88)).toBe("scene_88.zip");
  });

  it("keeps unquoted filename before semicolon", () => {
    const header = "attachment; filename=exported.zip; charset=utf-8";
    expect(extractFilename(header, 2)).toBe("exported.zip");
  });

  it("uses fallback filename for malformed filename token", async () => {
    vi.mocked(getVerseExportZip).mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      headers: { "content-disposition": "attachment; filename" },
    } as never);

    await exportScene(345);

    expect(mockLink.download).toBe("scene_345.zip");
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it("creates blob URL from response data and revokes it", async () => {
    const payload = new Uint8Array([9, 8, 7]);
    vi.mocked(getVerseExportZip).mockResolvedValue({
      data: payload,
      headers: { "content-disposition": 'attachment; filename="x.zip"' },
    } as never);

    await exportScene(10);

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:batch1-url");
  });

  it("propagates export API rejection", async () => {
    vi.mocked(getVerseExportZip).mockRejectedValue(new Error("export failed"));

    await expect(exportScene(1)).rejects.toThrow("export failed");
  });
});
