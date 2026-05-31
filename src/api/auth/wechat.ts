import request from "@/utils/request";

export const getQrcode = () => {
  return request({
    url: "/v1/wechat/qrcode",
    method: "get",
  });
};

export const refresh = (token: string | null) => {
  return request({
    url: `/v1/wechat/refresh?token=${token}`,
    method: "get",
  });
};
