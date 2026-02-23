/**
 * 认证相关类型定义
 */

/** 登录请求参数 */
export interface LoginRequest {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
}

/** 注册请求参数 */
export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  captcha?: string;
  captchaKey?: string;
}

/** 账号关联请求参数 */
export interface LinkAccountRequest {
  provider: "wechat" | "apple" | "google";
  code: string;
  state?: string;
}

/** Token 信息 */
export interface TokenInfo {
  token: string;
  accessToken: string; // JWT access token
  refreshToken: string;
  expires: string; // ISO 8601 格式
  tokenType?: string;
}

/** 登录响应 */
export interface LoginResponse {
  success?: boolean; // 兼容旧版 API
  token: TokenInfo;
  user?: {
    id: number;
    username: string;
    email?: string;
    avatar?: string;
  };
}

/** 刷新 Token 响应 */
export interface RefreshTokenResponse {
  token: TokenInfo;
}

/** 注册响应 */
export interface RegisterResponse {
  token: TokenInfo;
  user: {
    id: number;
    username: string;
  };
}
