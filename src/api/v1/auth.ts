import request from "@/utils/request";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
  LinkAccountRequest,
  TokenInfo,
} from "./types/auth";

type LinkAccountResponse = {
  success?: boolean;
  message?: string;
  token?: TokenInfo;
};

export const login = (data: LoginRequest) => {
  return request<LoginResponse>({
    url: `/v1/auth/login`,
    method: "post",
    data,
  });
};
export const refresh = (refreshToken: string) => {
  return request<RefreshTokenResponse>({
    url: `/v1/auth/refresh`,
    method: "post",
    data: { refreshToken },
  });
};
export const link = (data: LinkAccountRequest) => {
  return request<LinkAccountResponse>({
    url: `/v1/auth/link`,
    method: "post",
    data,
  });
};
export const register = (data: RegisterRequest) => {
  return request<RegisterResponse>({
    url: `/v1/auth/register`,
    method: "post",
    data,
  });
};

export const logout = () => {
  return new Promise((resolve) => {
    // localStorage.clear();
    resolve(true);
  });
  /*
  return request({
    url: `/v1/auth/logout`,
    method: "delete",
  });*/
};
