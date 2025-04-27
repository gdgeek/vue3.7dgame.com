import request from "@/utils/request";
import path from "path-browserify";

export const uploadFile = (data: any) => {
  console.error("uploadFile");
  console.error(data);
  return request({
    url: path.join("v1", "upload", "file"),
    method: "post",
    data,
  });
};
