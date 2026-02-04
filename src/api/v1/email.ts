import request from "@/utils/request";

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

// API错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  retry_after?: number;
}

// 发送验证码请求参数
export interface SendVerificationRequest {
  email: string;
}

// 验证验证码请求参数
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

/**
 * 发送邮箱验证码
 * @param email - 邮箱地址
 * @returns Promise<ApiResponse>
 */
export const sendVerificationCode = async (
  email: string
): Promise<ApiResponse> => {
  const response = await request<ApiResponse>({
    url: "/v1/email/send-verification",
    method: "post",
    data: { email },
  });
  return response.data;
};

/**
 * 验证邮箱验证码
 * @param email - 邮箱地址
 * @param code - 6位数字验证码
 * @returns Promise<ApiResponse>
 */
export const verifyEmailCode = async (
  email: string,
  code: string
): Promise<ApiResponse> => {
  const response = await request<ApiResponse>({
    url: "/v1/email/verify",
    method: "post",
    data: { email, code },
  });
  return response.data;
};

export default {
  sendVerificationCode,
  verifyEmailCode,
};
