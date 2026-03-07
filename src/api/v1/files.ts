import request from "@/utils/request";
import type { FileType, UploadFileType } from "../user/model";

export const postFile = (data: UploadFileType) => {
  return request<FileType>({
    url: `/v1/files`,
    method: "post",
    data,
  });
};
