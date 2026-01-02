import request from "@/utils/request";
import qs from "querystringify";

export const token = (bucket: string, region: string = "ap-nanjing") => {
  return request({
    url: `/tencent-clouds/token${qs.stringify({ bucket, region }, true)}`,
    method: "get",
  });
};

export const store = () => {
  return request({
    url: `/tencent-clouds/store`,
    method: "get",
  });
};

export const cloud = () => {
  return request({
    url: `/tencent-clouds/cloud`,
    method: "get",
  });
};
