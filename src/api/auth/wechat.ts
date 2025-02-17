import request from "@/utils/request";
import env from "@/environment";
export const getQrcode = () => {
  const url = env.auth_api + "/v1/wechat/qrcode";
  return request({
    url,
    method: "get",
  });
};

export const refresh = (token: string | null) => {
  const url = env.auth_api + "/v1/wechat/refresh?token=" + token;
  return request({
    url,
    method: "get",
  });
};
