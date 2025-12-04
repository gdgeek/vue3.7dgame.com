import request from "@/utils/request";
import { FileType } from "../user/model";

export const postFile = (data: any) => {
  return request<FileType>({
    url: `/files`,
    method: "post",
    data,
  });
};
export default {
  post: postFile,
};
