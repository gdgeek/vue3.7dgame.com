import request from "@/utils/request";
const login = (data: any) => {
  const url = "/v1/auth/login";
  return request({
    url,
    method: "post",
    data,
  });
};
const refresh = (refreshToken: string) => {
  const url = "/v1/auth/refresh";
  return request({
    url,
    method: "post",
    data: { refreshToken },
  });
};
const link = (data: any) => {
  const url = "/v1/auth/link";
  return request({
    url,
    method: "post",
    data,
  });
};
const register = (data: any) => {
  const url = "/v1/auth/register";
  return request({
    url,
    method: "post",
    data,
  });
};

export default {
  login,
  refresh,
};
