import request from "@/utils/request";
import { postFile } from "@/api/v1/files";
import { uploadResourceFile } from "@/services/resource-upload";

export async function uploadSubtitle(name: string, srt: string) {
  const { data } = await request.post<{ json: string; directory: string }>(
    "/v1/subtitles/prepare",
    { srt },
    { skipErrorMessage: true }
  );
  const file = new File([data.json], name.replace(/\.srt$/i, "") + ".json", {
    type: "application/json",
  });
  const upload = await uploadResourceFile(file, data.directory);
  const record = await postFile(upload.data);
  return { name, srt, uploadedFileId: record.data.id };
}
