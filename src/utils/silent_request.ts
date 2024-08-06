import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import env from "@/environment";

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  // baseURL: "https://api.7dgame.com",
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
    return Promise.reject(error.response.data);
  }
);

// 导出 axios 实例
export default service;
