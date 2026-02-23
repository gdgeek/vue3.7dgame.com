import request from "@/utils/request";
import type {
  WechatLoginRequest,
  WechatLoginResponse,
  WechatLinkRequest,
  WechatLinkResponse,
  WechatRegisterRequest,
  WechatRegisterResponse,
} from "./types/wechat";

const login = (data: WechatLoginRequest) => {
  return request<WechatLoginResponse>({
    url: `/v1/wechat/login`,
    method: "post",
    data,
  });
};
const link = (data: WechatLinkRequest) => {
  return request<WechatLinkResponse>({
    url: `/v1/wechat/link`,
    method: "post",
    data,
  });
};

const register = (data: WechatRegisterRequest) => {
  return request<WechatRegisterResponse>({
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
