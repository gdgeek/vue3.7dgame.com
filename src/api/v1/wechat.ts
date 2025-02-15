import request from "@/utils/request";
const login = (data: any) => {
  const url = "/v1/wechat/login";
  return request({
    url,
    method: "post",
    data,
  });
};
const link = (data: any) => {
  const url = "/v1/wechat/link";
  return request({
    url,
    method: "post",
    data,
  });
};
export default {
  login,
  link,
};
