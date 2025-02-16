import request from "@/utils/request";
const login = (data: any) => {
  const url = "/v1/auth/login";
  return request({
    url,
    method: "post",
    data,
  });
};
const refresh = (data: any) => {
  const url = "/v1/auth/refresh";
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
