import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useUserStoreHook } from "@/store/modules/user";
import { ResultEnum } from "@/enums/ResultEnum";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { useRouter } from "@/router";

const { t } = useI18n();

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    if (accessToken) {
      config.headers.Authorization = accessToken;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// 异常处理
function showErrorMessage(
  message: string,
  router: ReturnType<typeof useRouter>,
  duration = 5000
) {
  ElMessage({
    message,
    type: "error",
    duration,
  });
  useUserStoreHook()
    .resetToken()
    .then(() => {
      router.push({ path: "/login" });
    });
}

function handleUnauthorized(router: ReturnType<typeof useRouter>) {
  showErrorMessage(t("axios.message1"), router);
  return Promise.reject("");
}

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: any) => {
    const router = useRouter();
    const { response } = error;

    if (!response) {
      if (error.message === "Network Error") {
        showErrorMessage(t("axios.message2"), router);
      } else {
        showErrorMessage(error.message, router);
      }
      return Promise.reject(error);
    }

    if (response.status === 401) {
      return handleUnauthorized(router);
    } else if (response.status >= 500) {
      showErrorMessage(t("axios.message3"), router);
    } else {
      const message = response.data.message || error.message;
      showErrorMessage(message, router);
    }

    return Promise.reject(response);
  }
);

// 导出 axios 实例
export default service;
