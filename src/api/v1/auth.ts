import request from "@/utils/request";
const login = (data: any) => {
  return request({
    url: `/v1/auth/login`,
    method: "post",
    data,
  });
};
const refresh = (refreshToken: string) => {
  return request({
    url: `/v1/auth/refresh`,
    method: "post",
    data: { refreshToken },
  });
};
const link = (data: any) => {
  return request({
    url: `/v1/auth/link`,
    method: "post",
    data,
  });
};
const register = (data: any) => {
  return request({
    url: `/v1/auth/register`,
    method: "post",
    data,
  });
};

export default {
  login,
  refresh,
  link,
  register,
};
