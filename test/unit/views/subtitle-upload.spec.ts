import { beforeEach, expect, it, vi } from "vitest";
import { uploadSubtitle } from "@/views/subtitle/uploadSubtitle";

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  register: vi.fn(),
  hash: vi.fn(),
  has: vi.fn(),
  upload: vi.fn(),
  privateHandler: vi.fn(),
  publicHandler: vi.fn(),
  url: vi.fn(),
}));
vi.mock("@/utils/request", () => ({ default: { post: mocks.prepare } }));
vi.mock("@/api/v1/files", () => ({ postFile: mocks.register }));
vi.mock("@/store/modules/config", () => ({
  useFileStore: () => ({
    store: {
      fileMD5: mocks.hash,
      fileHas: mocks.has,
      fileUpload: mocks.upload,
      privateHandler: mocks.privateHandler,
      publicHandler: mocks.publicHandler,
      fileUrl: mocks.url,
    },
  }),
}));
const json =
  '{"version":1,"cues":[{"startMs":500,"endMs":2000,"text":"第一条字幕"}]}';
const handler = { bucket: "public" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepare.mockResolvedValue({ data: { json, directory: "subtitles/7" } });
  mocks.publicHandler.mockResolvedValue(handler);
  mocks.hash.mockResolvedValue("digest");
  mocks.url.mockReturnValue("https://public.test/subtitles/7/digest.json");
  mocks.register.mockResolvedValue({ data: { id: 42 } });
});
it.each([true, false])(
  "registers an unsigned URL when the public object exists=%s",
  async (exists) => {
    mocks.has.mockResolvedValue(exists);
    expect(await uploadSubtitle("测试.srt", "SRT")).toEqual({
      name: "测试.srt",
      srt: "SRT",
      uploadedFileId: 42,
    });
    expect(mocks.has).toHaveBeenCalledWith(
      "digest",
      ".json",
      handler,
      "subtitles/7"
    );
    expect(mocks.privateHandler).not.toHaveBeenCalled();
    expect(mocks.url).toHaveBeenCalledWith(
      "digest",
      ".json",
      handler,
      "subtitles/7",
      false
    );
    expect(mocks.upload).toHaveBeenCalledTimes(exists ? 0 : 1);
    const file = mocks.hash.mock.calls[0][0] as File;
    expect(file.size).toBe(new TextEncoder().encode(json).length);
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "测试.json",
        key: "digest.json",
        type: "application/json",
        url: mocks.url(),
      })
    );
  }
);
