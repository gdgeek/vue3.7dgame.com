import request from "@/utils/request";
import qs from "querystringify";

export const token = (
  bucket: string,
  region: string = "ap-nanjing",
  key?: string
) => {
  return request({
    url: `/v1/tencent-clouds/token${qs.stringify({ bucket, region, key }, true)}`,
    method: "get",
  });
};

export const store = () => {
  return request({
    url: `/v1/tencent-clouds/store`,
    method: "get",
  });
};

export const cloud = () => {
  return request({
    url: `/v1/tencent-clouds/cloud`,
    method: "get",
  });
};
