import { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useRouter } from "@/router";
import i18n from "@/lang";

// 缓存 router 实例，避免每次错误处理都重新调用 useRouter()
let _router: ReturnType<typeof useRouter> | null = null;
const getRouter = () => {
  if (!_router) _router = useRouter();
  return _router;
};
import { ElMessage } from "element-plus";
import { refresh as authRefresh } from "@/api/v1/auth";
import env from "@/environment";
import { ref, watch } from "vue";
import Token from "@/store/modules/token";
import { logger } from "@/utils/logger";
import { createFailoverAxios } from "@/utils/failover";

const lang = ref(i18n.global.locale.value);
watch(
  () => i18n.global.locale.value,
  (newLang) => {
    lang.value = newLang;
  }
);

// 动态错误消息
const getMessageArray = () => {
  return [
    i18n.global.t("request.loginExpired"),
    i18n.global.t("request.networkError"),
    i18n.global.t("request.serverError"),
  ];
};

// 所有并发请求共享同一个刷新 Promise：刷新完成后延迟一个微任务再清空，
// 确保所有 await refreshPromise 的调用者都拿到结果后再允许下次刷新。
let refreshPromise: Promise<unknown> | null = null;

// 刷新token的API白名单
const refreshTokenWhitelist = [
  `/v1/auth/refresh`, // 刷新token的接口
  `/v1/auth/login`, // 登录接口
  `/v1/auth/logout`, // 登出接口
];

// 判断token是否即将过期（例如，提前5分钟刷新）
const isTokenExpiringSoon = (token: { expires?: string }): boolean => {
  if (!token || !token.expires) return false;

  // 转换为毫秒时间戳
  const expiryTime = new Date(token.expires).getTime();
  const currentTime = new Date().getTime();

  // 如果token在5分钟内过期，返回true
  const fiveMinutesMs = 5 * 60 * 1000;
  return expiryTime - currentTime < fiveMinutesMs;
};

// 创建带主备切换能力的 axios 实例
const service = createFailoverAxios({
  primaryUrl: env.api,
  backupUrl: env.backup_api,
  healthPath: "/health",
  axiosConfig: {
    timeout: 50000,
    headers: { "Content-Type": "application/json;charset=utf-8" },
  },
  logTag: "[API Failover]",
});

const refreshToken = async () => {
  const token = Token.getToken();
  if (!token || !token.refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await authRefresh(token.refreshToken);
  if (response.data) {
    Token.setToken(response.data.token);
  }
  return response.data;
};

// 请求拦截器（Token 刷新）
service.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = Token.getToken();

    // 设置token
    if (token != null) {
      config.headers.Authorization = `Bearer ${token.accessToken}`;

      // 检查请求URL是否在白名单中
      const isWhitelisted = refreshTokenWhitelist.some((url) =>
        config.url?.includes(url)
      );
      if (!isWhitelisted && isTokenExpiringSoon(token)) {
        try {
          if (!refreshPromise) {
            // 启动刷新，用 .then 在微任务中清空，保证所有并发 await 都已消费结果
            refreshPromise = refreshToken().then(
              (result) => {
                Promise.resolve().then(() => {
                  refreshPromise = null;
                });
                return result;
              },
              (err) => {
                Promise.resolve().then(() => {
                  refreshPromise = null;
                });
                throw err;
              }
            );
          }
          await refreshPromise;
          const newToken = Token.getToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken.accessToken}`;
          }
        } catch (err) {
          // 刷新失败 -> 跳转登录
          return handleUnauthorized(getRouter(), err);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function showErrorMessage(message: string, duration = 5000) {
  if (!message) return;
  ElMessage.error({ message, duration });
}

// Flag to prevent multiple unauthorized handlers from executing
let isHandlingUnauthorized = false;

function handleUnauthorized(
  router: ReturnType<typeof useRouter>,
  error?: unknown
) {
  const rejectionReason = error ?? new Error("Unauthorized");

  // If already handling unauthorized, just reject silently
  if (isHandlingUnauthorized) {
    return Promise.reject(rejectionReason);
  }

  isHandlingUnauthorized = true;
  const messages = getMessageArray();

  showErrorMessage(messages[0]);

  // 只清除本地 token 防止后续请求再触发 401，完整 logout 交给 logout 页面处理
  Token.removeToken();

  router.push({ path: "/site/logout" });

  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 1000);

  return Promise.reject(rejectionReason);
}

// 响应拦截器（Auth / HTTP 错误处理）
// 注意：主备切换已由 createFailoverAxios 的拦截器处理
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: unknown) => {
    const router = getRouter();
    const axiosError = error as import("axios").AxiosError;
    const { response } = axiosError;
    const skipErrorMessage = Boolean(axiosError.config?.skipErrorMessage);
    const messages = getMessageArray();

    if (!response) {
      if (axiosError.message === "Network Error") {
        if (!skipErrorMessage) {
          showErrorMessage(messages[1]);
        }
      } else if (!skipErrorMessage) {
        logger.error(i18n.global.t("request.unknownError"), axiosError.message);
        showErrorMessage(axiosError.message);
      }
      return Promise.reject(error);
    }
    if (response.status === 401) {
      return handleUnauthorized(router, error);
    } else if (response.status === 404) {
      if (!skipErrorMessage) {
        showErrorMessage(i18n.global.t("request.error404"));
      }
    } else if (response.status >= 500) {
      logger.error(i18n.global.t("request.serverError"), response);
      // 服务器内部错误
      if (!skipErrorMessage) {
        showErrorMessage(messages[2]);
      }
    } else {
      const data = response.data as Record<string, unknown> | undefined;
      const message = (data?.message as string) || axiosError.message;
      if (!skipErrorMessage) {
        showErrorMessage(message);
      }
    }

    return Promise.reject(error);
  }
);

// 导出 axios 实例
export default service;
