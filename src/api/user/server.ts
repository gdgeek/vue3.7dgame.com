import request from "@/utils/request";
import qs from "querystringify";
import path from "path-browserify";

export const bindEmail = (email: string) => {
  return request({
    url: "/servers/bind-email",
    method: "post",
    data: { email },
  });
};

export const resetPassword = (oldPassword: string, password: string) => {
  return request({
    url: "/servers/reset-password",
    method: "post",
    data: { oldPassword, password },
  });
};

