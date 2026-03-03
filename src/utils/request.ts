import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useRouter } from "@/router";
import i18n from "@/lang";
import { ElMessage } from "element-plus";
import { refresh as authRefresh } from "@/api/v1/auth";
import env from "@/environment";
import { ref, watch } from "vue";
import Token from "@/store/modules/token";
import { logger } from "@/utils/logger";

const lang = ref(i18n.global.locale.value);
watch(
  () => i18n.global.locale.value,
  (newLang) => {
    lang.value = newLang;
  }
);

// --- API Failover Configuration ---
const PRIMARY_API = env.api;
const BACKUP_API = env.backup_api;
let currentApi = PRIMARY_API;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

const startHealthCheck = () => {
  if (healthCheckTimer || !PRIMARY_API) return;

  healthCheckTimer = setInterval(async () => {
    try {
      await axios.get(`${PRIMARY_API}/health`, { timeout: 3000 });
      logger.info("[API Failover] Primary API restored, switching back.");
      currentApi = PRIMARY_API;
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
      }
    } catch (e) {
      // Primary still down
    }
  }, 30000);
};
// ----------------------------------

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

// 创建 axios 实例
const service = axios.create({
  baseURL: currentApi,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
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
// 请求拦截器
service.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // --- Failover Logic: Dynamic Base URL ---
    // 注意：此处故意只覆盖「非绝对地址」的 baseURL
    // 以 http 开头的绝对地址表示调用方明确指定了目标，应保持不变
    // failover 切换到 backup 后，retry 请求会在响应拦截器中显式设置
    // config.baseURL = currentApi，从而绕过此处的 http 判断直接生效
    if (currentApi && !config.baseURL?.startsWith("http")) {
      config.baseURL = currentApi;
    }
    // ----------------------------------------

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
          const router = useRouter();
          return handleUnauthorized(router);
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

function handleUnauthorized(router: ReturnType<typeof useRouter>) {
  // If already handling unauthorized, just reject silently
  if (isHandlingUnauthorized) {
    return Promise.reject("");
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

  return Promise.reject("");
}

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  //
  async (error) => {
    const router = useRouter();
    const { response, config } = error;
    const messages = getMessageArray();

    // --- Failover Logic: Retry on Network Error ---
    if (
      !response &&
      config &&
      !config._retry &&
      BACKUP_API &&
      currentApi === PRIMARY_API
    ) {
      logger.warn(
        "[API Failover] Primary API unreachable, switching to backup."
      );
      currentApi = BACKUP_API;
      config._retry = true;
      config.baseURL = currentApi;
      startHealthCheck();
      return service(config);
    }
    // --------------------------------------------

    if (!response) {
      if (error.message === "Network Error") {
        showErrorMessage(messages[1]);
      } else {
        logger.error("未知错误", error.message);

        showErrorMessage(error.message);
      }
      return Promise.reject(error);
    }
    if (response.status === 401) {
      return handleUnauthorized(router);
    } else if (response.status === 404) {
      showErrorMessage(i18n.global.t("request.error404"));
    } else if (response.status >= 500) {
      logger.error("服务器内部错误", response);
      // 服务器内部错误
      showErrorMessage(messages[2]);
    } else {
      const message = response.data.message || error.message;
      showErrorMessage(message);
    }

    return Promise.reject(response);
  }
);

// 导出 axios 实例
export default service;
