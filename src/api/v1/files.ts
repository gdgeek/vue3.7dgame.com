import request from "@/utils/request";
import path from "path-browserify";
import { Avatar } from "../user/model";

export const postFile = (data: any) => {
  const url = path.join("v1", "files");
  return request<Avatar>({
    url,
    method: "post",
    data,
  });
};
export default {
  post: postFile,
}
