import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useUserStoreHook } from "@/store/modules/user";
import { ResultEnum } from "@/enums/ResultEnum";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { useUserStore } from "@/store/modules/user";
import env from "@/environment";

// 创建 axios 实例
const service = axios.create({
  // baseURL: import.meta.env.VITE_APP_BASE_API,
  baseURL: "https://api.7dgame.com",
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    // console.log("accessToken:", accessToken);
    if (accessToken) {
      config.headers.Authorization = accessToken;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: any) => {
    // 异常处理
    if (
      (typeof error.response === "undefined" &&
        error.message === "Network Error") ||
      (typeof error.response !== "undefined" && error.response.status === 401)
    ) {
      ElMessage({
        message: "登录过期，请重新登录",
        type: "error",
        duration: 5 * 1000,
      });
      // 清除重置token
      const userStore = useUserStore();
      userStore.resetToken();
      return Promise.reject("");
    } else {
      ElMessage({
        message: error.message,
        type: "error",
        duration: 5 * 1000,
      });
      setTimeout(() => {
        let message = "";
        try {
          message = JSON.parse(error.response.data.message);
        } catch {
          if (typeof error.response === "undefined") {
            message = error.message;
          } else {
            message = error.response.data.message;
          }
        }
        ElMessage.error({
          message: message,
          type: "error",
          duration: 5 * 1000,
        });
      }, 300);

      return Promise.reject(error.response.data);
    }
  }
);

// 导出 axios 实例
export default service;
