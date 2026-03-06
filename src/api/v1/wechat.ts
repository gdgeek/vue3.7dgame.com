import request from "@/utils/request";
import type {
  WechatLoginRequest,
  WechatLoginResponse,
  WechatLinkRequest,
  WechatLinkResponse,
  WechatRegisterRequest,
  WechatRegisterResponse,
} from "./types/wechat";

export const login = (data: WechatLoginRequest) => {
  return request<WechatLoginResponse>({
    url: `/v1/wechat/login`,
    method: "post",
    data,
  });
};
export const link = (data: WechatLinkRequest) => {
  return request<WechatLinkResponse>({
    url: `/v1/wechat/link`,
    method: "post",
    data,
  });
};

export const register = (data: WechatRegisterRequest) => {
  return request<WechatRegisterResponse>({
    url: `/v1/wechat/register`,
    method: "post",
    data,
  });
};
