import request from "@/utils/request";
import path from "path";

export const uploadFile = (data: any) => {
  return request({
    url: path.join("v1", "uploads", "file"),
    method: "post",
    data,
  });
};
