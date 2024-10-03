import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const token = (bucket: string, region: string = "ap-nanjing") => {

  const url = path.join(
    "v1",
    "tencent-clouds",
    "token" + qs.stringify({ bucket, region }, true)
  );
  return request({
    url,
    method: "get",
  });
};

export const store = () => {
  const url = path.join("v1", "tencent-clouds", "store");
  return request({
    url,
    method: "get",
  });
};

export const cloud = () => {
  const url = path.join("v1", "tencent-clouds", "cloud");
  return request({
    url,
    method: "get",
  });
};
