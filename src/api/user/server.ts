import request from "@/utils/request";

export const bindEmail = (email: string) => {
  return request({
    url: `/servers/bind-email`,
    method: "post",
    data: { email },
  });
};

export const resetPassword = (oldPassword: string, password: string) => {
  return request({
    url: `/servers/reset-password`,
    method: "post",
    data: { oldPassword, password },
  });
};
