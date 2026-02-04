import request from "@/utils/request";
const login = (data: any) => {
  return request({
    url: `/v1/wechat/login`,
    method: "post",
    data,
  });
};
const link = (data: any) => {
  return request({
    url: `/v1/wechat/link`,
    method: "post",
    data,
  });
};

const register = (data: any) => {
  return request({
    url: `/v1/wechat/register`,
    method: "post",
    data,
  });
};
export default {
  login,
  link,
  register,
};
