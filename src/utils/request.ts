import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useRouter } from "@/router";
import i18n from "@/lang";
import { ElMessage } from "element-plus";
import env from "@/environment";
import { ref, watch } from "vue";
import { logger } from "@/utils/logger";
import authClient from "@/services/auth/authClient";
import { isIdentityProviderEnabled } from "@/services/auth/provider";
import {
  isDefinitiveSessionFailure,
  SessionSupersededError,
} from "@/services/auth/sessionErrors";

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

// 创建 axios 实例（failover 由 Nginx 层处理）
const service = axios.create({
  baseURL: env.api,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

// 请求拦截器（Token 刷新）
service.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Existing endpoint envelopes stay stable; explicit Identity mode has one writer.
    if (
      isIdentityProviderEnabled() &&
      /^\/v1\/(auth|email|password|wechat)\//.test(config.url ?? "") &&
      (!config.baseURL || config.baseURL === env.api)
    ) {
      config.baseURL = env.authApi || "/api-auth";
    }
    config.authSessionEpoch ??= authClient.getSessionEpoch?.();
    const token = authClient.getTokenInfo();

    // 设置token
    if (token != null) {
      const accessToken = authClient.getAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // 检查请求URL是否在白名单中
      const isWhitelisted = refreshTokenWhitelist.some((url) =>
        config.url?.includes(url)
      );
      if (!isWhitelisted && isTokenExpiringSoon(token)) {
        try {
          await authClient.refresh();
          const newAccessToken = authClient.getAccessToken();
          if (newAccessToken) {
            config.headers.Authorization = `Bearer ${newAccessToken}`;
          }
        } catch (err) {
          if (getAuthScope(config) === "plugin") {
            return Promise.reject(err);
          }

          if (!isDefinitiveSessionFailure(err)) {
            // A drain/network failure must not erase a still usable login session.
            if (
              !(err instanceof SessionSupersededError) &&
              new Date(token.expires).getTime() > Date.now()
            )
              return config;
            return Promise.reject(err);
          }
          const router = useRouter();
          return handleUnauthorized(router, err);
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
  authClient.clearToken("unauthorized");

  router.push({ path: "/site/logout" });

  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 1000);

  return Promise.reject(rejectionReason);
}

function getAuthScope(
  config?: import("axios").InternalAxiosRequestConfig
): "host" | "plugin" {
  return config?.authScope ?? "host";
}

// 响应拦截器（Auth / HTTP 错误处理）
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: unknown) => {
    const router = useRouter();
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
      if (getAuthScope(axiosError.config) === "plugin") {
        return Promise.reject(error);
      }
      const config = axiosError.config;
      if (
        config?.authSessionEpoch &&
        config.authSessionEpoch !== authClient.getSessionEpoch?.()
      )
        return Promise.reject(error);
      const isAuthEndpoint = refreshTokenWhitelist.some((path) =>
        config?.url?.includes(path)
      );
      if (
        config &&
        !config.authRetried &&
        !isAuthEndpoint &&
        authClient.getTokenInfo()?.refreshToken
      ) {
        config.authRetried = true;
        const sent = String(config.headers?.Authorization ?? "").replace(
          /^Bearer\s+/i,
          ""
        );
        try {
          if (
            !authClient.getAccessToken() ||
            sent === authClient.getAccessToken()
          )
            await authClient.refresh();
          if (
            config.authSessionEpoch &&
            config.authSessionEpoch !== authClient.getSessionEpoch?.()
          )
            return Promise.reject(error);
          const method = (config.method ?? "get").toLowerCase();
          const safe =
            ["get", "head", "options"].includes(method) ||
            Boolean(
              config.headers?.["Idempotency-Key"] ||
                config.headers?.["X-Idempotency-Key"]
            );
          if (!safe) return Promise.reject(error);
          config.headers.Authorization = `Bearer ${authClient.getAccessToken()}`;
          return service(config);
        } catch (refreshError) {
          if (!isDefinitiveSessionFailure(refreshError))
            return Promise.reject(refreshError);
          return handleUnauthorized(router, refreshError);
        }
      }
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
