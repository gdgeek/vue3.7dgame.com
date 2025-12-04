import request from "@/utils/request";
const login = (data: any) => {
  return request({
    url: `/wechat/login`,
    method: "post",
    data,
  });
};
const link = (data: any) => {
  return request({
    url: `/wechat/link`,
    method: "post",
    data,
  });
};

const register = (data: any) => {
  return request({
    url: `/wechat/register`,
    method: "post",
    data,
  });
};
export default {
  login,
  link,
  register,
};
