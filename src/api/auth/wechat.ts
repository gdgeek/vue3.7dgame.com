import request from "@/utils/request";
import env from "@/environment";

const authBaseConfig = () => {
  const baseURL = env.wechatAuthApi?.replace(/\/+$/, "");
  return baseURL ? { baseURL } : {};
};

export const getQrcode = () => {
  return request({
    ...authBaseConfig(),
    url: "/v1/wechat/qrcode",
    method: "get",
  });
};

export const refresh = (token: string | null) => {
  return request({
    ...authBaseConfig(),
    url: `/v1/wechat/refresh?token=${token}`,
    method: "get",
  });
};
