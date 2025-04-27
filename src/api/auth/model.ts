export type RegisterData = {
  username: string; //用户名

  password: string; //密码
  repassword: string; //确认密码
};

export type LinkData = {
  username: string; //用户名
  password: string; //密码
};
export interface AppleIdToken {
  apple_id: string;
  token: string;
}
export interface AppleData {
  key: string;
  url: string;
  data: any;
}

export type AppleIdTokenAndUserPassData = {
  username: string;
  password: string;
  token: string;
  apple_id: string;
};
export type UserData = {
  nickname: string;
  email: string;
  username: string;
  auth: string;
};
export type AppleIdReturn = {
  apple_id: string;
  email: string;
  user: UserData;
  token: string;
};
/**
 * 登录请求参数
 */
export type LoginData = {
  /**
   * 用户名
   */
  username: string;
  /**
   * 密码
   */
  password: string;

  /**
   * 验证码缓存key
   */
  // captchaKey?: string;

  /**
   * 验证码
   */
  // captchaCode?: string;
};

/**
 * 登录响应
 */
type Data = {
  username: string;
  id: number;
  nickname: string | null;
  info: string | null;
  avatar_id: string | null;
  email: string | null;
  emailBind: boolean;
};

type User = {
  username: string;
  data: Data;
  roles: string[];
};

// export type LoginResult = {
//   data: any;
//   access_token: string;
//   user: User;
// };

export type LoginResult = {
  nickname: string;
  email: string | null;
  username: string;
  roles: string[];
  auth: string;
};

/**
 * 验证码响应
 */
export interface CaptchaResult {
  /**
   * 验证码缓存key
   */
  captchaKey: string;
  /**
   * 验证码图片Base64字符串
   */
  captchaBase64: string;
}
