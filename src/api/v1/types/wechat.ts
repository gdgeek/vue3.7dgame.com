/**
 * 微信相关类型定义
 */

import type { TokenInfo } from "./auth";

/** 微信登录请求 */
export interface WechatLoginRequest {
  token: string;
}

/** 微信登录响应 */
export interface WechatLoginResponse {
  success?: boolean;
  message?: string;
  token: TokenInfo;
  user?: {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
    wechat_openid?: string;
  };
}

/** 微信账号关联请求 */
export interface WechatLinkRequest {
  token: string;
}

/** 微信账号关联响应 */
export interface WechatLinkResponse {
  message: string;
  success: boolean;
}

/** 微信注册请求 */
export interface WechatRegisterRequest {
  token: string;
  username: string;
  password: string;
  nickname?: string;
}

/** 微信注册响应 */
export interface WechatRegisterResponse {
  success?: boolean;
  message?: string;
  token: TokenInfo;
  user?: {
    id: number;
    username: string;
    nickname?: string;
    wechat_openid?: string;
  };
}
