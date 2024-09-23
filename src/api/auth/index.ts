import request from "@/utils/request";
import {
  AppleIdTokenAndUserPassData,
  CaptchaResult,
  LoginData,
  LoginResult,
  AppleIdReturn,
} from "./model";
interface ApiResponse<T> {
  status: number; // 响应状态码
  message: string; // 响应消息
  data: T; // 实际的数据
}
class AuthAPI {
  static appleIdCreate(data: AppleIdTokenAndUserPassData) {
    alert(JSON.stringify(data));
    return request<AppleIdTokenAndUserPassData, ApiResponse<AppleIdReturn>>({
      url: "/v1/site/apple-id-create",
      method: "post",
      data: data,
    });
  }
  static appleIdLink(data: AppleIdTokenAndUserPassData) {
    alert(JSON.stringify(data));
    return request<AppleIdTokenAndUserPassData, ApiResponse<AppleIdReturn>>({
      url: "/v1/site/apple-id-link",
      method: "post",
      data: data,
    });
  }

  /**
   * 登录API
   *
   * @param data {LoginData}
   * @returns
   */
  static login(data: LoginData) {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("password", data.password);
    return request<LoginResult>({
      url: "/v1/site/login",
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  /**
   * 注销API
   */
  static logout() {
    return request({
      url: "/api/v1/auth/logout",
      method: "delete",
    });
  }

  /**
   * 获取验证码
   */
  static getCaptcha() {
    return request<any, CaptchaResult>({
      url: "/api/v1/auth/captcha",
      method: "get",
    });
  }
}

export default AuthAPI;
