import request from "@/utils/request";
import path from "path-browserify";
import { FileType } from "../user/model";

export const postFile = (data: any) => {
  const url = path.join("v1", "files");
  return request<FileType>({
    url,
    method: "post",
    data,
  });
};
export default {
  post: postFile,
};
