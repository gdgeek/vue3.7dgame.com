import request from "@/utils/request";
import env from "@/environment";

const passwordApiBase = env.password_api;

export interface PasswordApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  retry_after?: number;
}

export interface PasswordApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  valid?: boolean;
  error?: PasswordApiError;
}

export const requestPasswordReset = async (
  email: string
): Promise<PasswordApiResponse> => {
  const response = await request<PasswordApiResponse>({
    baseURL: passwordApiBase,
    url: "/v1/password/request-reset",
    method: "post",
    data: { email },
  });
  return response.data;
};

export const verifyResetCode = async (
  email: string,
  code: string
): Promise<PasswordApiResponse> => {
  const response = await request<PasswordApiResponse>({
    baseURL: passwordApiBase,
    url: "/v1/password/verify-code",
    method: "post",
    data: { email, code },
  });
  return response.data;
};

export const resetPasswordByCode = async (
  email: string,
  code: string,
  password: string
): Promise<PasswordApiResponse> => {
  const response = await request<PasswordApiResponse>({
    baseURL: passwordApiBase,
    url: "/v1/password/reset",
    method: "post",
    data: { email, code, password },
  });
  return response.data;
};

export const changePassword = async (
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<PasswordApiResponse> => {
  const response = await request<PasswordApiResponse>({
    baseURL: passwordApiBase,
    url: "/v1/password/change",
    method: "post",
    data: {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    },
  });
  return response.data;
};
