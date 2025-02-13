import request from "@/utils/request";
import env from "@/environment";
export const getQrcode = () => {
  const url = env.auth_api + "/v1/wechat/qrcode";
  return request({
    url,
    method: "get",
  });
};
