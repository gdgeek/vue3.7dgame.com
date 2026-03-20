import request from "@/utils/request";

// API响应基础类型
export interface ApiResponse<T = unknown> {
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

export interface EmailStatus {
  user_id: number;
  username: string;
  email: string | null;
  email_verified: boolean;
  email_verified_at: number | null;
  email_verified_at_formatted: string | null;
}

export interface EmailCooldown {
  email: string | null;
  can_send: boolean;
  retry_after: number;
  limit_seconds: number;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
  change_token?: string;
}

export interface VerifyChangeConfirmationData {
  change_token: string;
  expires_in: number;
}

export interface EmailUserData {
  id: number;
  username?: string;
  email: string | null;
  email_verified_at: number | null;
}

export interface VerifyEmailData {
  user: EmailUserData;
}

export interface UnbindEmailData {
  user: EmailUserData;
}

export interface TestEmailData {
  from: string;
  to: string;
  time: string;
}

export const getEmailStatus = async (): Promise<ApiResponse<EmailStatus>> => {
  const response = await request<ApiResponse<EmailStatus>>({
    url: "/v1/email/status",
    method: "get",
  });
  return response.data;
};

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

export const verifyEmailCode = async (
  payload: VerifyEmailRequest
): Promise<ApiResponse<VerifyEmailData>> => {
  const response = await request<ApiResponse<VerifyEmailData>>({
    url: "/v1/email/verify",
    method: "post",
    data: payload,
  });
  return response.data;
};

export const sendChangeConfirmation = async (): Promise<ApiResponse> => {
  const response = await request<ApiResponse>({
    url: "/v1/email/send-change-confirmation",
    method: "post",
  });
  return response.data;
};

export const verifyChangeConfirmation = async (
  code: string
): Promise<ApiResponse<VerifyChangeConfirmationData>> => {
  const response = await request<ApiResponse<VerifyChangeConfirmationData>>({
    url: "/v1/email/verify-change-confirmation",
    method: "post",
    data: { code },
  });
  return response.data;
};

export const unbindEmail = async (
  code?: string
): Promise<ApiResponse<UnbindEmailData>> => {
  const response = await request<ApiResponse<UnbindEmailData>>({
    url: "/v1/email/unbind",
    method: "post",
    data: code ? { code } : {},
  });
  return response.data;
};

export const getEmailCooldown = async (
  email?: string
): Promise<ApiResponse<EmailCooldown>> => {
  const response = await request<ApiResponse<EmailCooldown>>({
    url: "/v1/email/cooldown",
    method: "get",
    params: email ? { email } : {},
  });
  return response.data;
};

export const testEmailService = async (): Promise<
  ApiResponse<TestEmailData>
> => {
  const response = await request<ApiResponse<TestEmailData>>({
    url: "/v1/email/test",
    method: "get",
  });
  return response.data;
};
