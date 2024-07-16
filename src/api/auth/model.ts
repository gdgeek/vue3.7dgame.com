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

export type LoginResult = {
  data: any;
  access_token: string;
  user: User;
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
