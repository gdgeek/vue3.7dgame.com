import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useDomainStoreHook } from "@/store/modules/domain";

// 创建一个 axios 实例
const service = axios.create({
  baseURL: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOC_API || ""
    : "/api-doc",
  timeout: 50000,
});

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 如果域名配置了 blog 地址，动态覆盖 baseURL
    try {
      const domainStore = useDomainStoreHook();
      if (domainStore.blog) {
        // blog 存的是 WordPress 域名，拼接 WP REST API 路径
        const blogUrl = domainStore.blog.replace(/\/+$/, "");
        config.baseURL = `${blogUrl}/wp-json/wp/v2/`;
      }
    } catch {
      // store 未初始化时忽略，使用默认 baseURL
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// WordPress provides optional content. Its callers handle missing content locally.
service.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error.response ?? error)
);

export default service;
