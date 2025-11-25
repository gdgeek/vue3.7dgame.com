import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useUserStoreHook } from "@/store/modules/user";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { useRouter } from "@/router";
import i18n from "@/lang";
import { ElMessage } from "element-plus";
import AuthAPI from "@/api/v1/auth";
import env from "@/environment";
import { ref, watch } from "vue";
import Token from "@/store/modules/token";

const lang = ref(i18n.global.locale.value);
watch(
  () => i18n.global.locale.value,
  (newLang) => {
    lang.value = newLang;
  }
);

// 动态错误消息
const messages = {
  en: [
    "Login expired, please log in again",
    "Network error, please check your internet connection",
    "Internal server error, please try again later",
  ],
  ja: [
    "ログインの有効期限が切れました。再度ログインしてください",
    "ネットワークエラーです。ネットワーク接続を確認してください",
    "サーバー内部エラーです。しばらくしてから再度お試しください",
  ],
  zh: [
    "登录过期，请重新登录",
    "网络错误，请检查您的网络连接",
    "服务器内部错误，请稍后再试",
  ],
};

const getMessageArray = () => {
  switch (lang.value) {
    case "en":
      return messages.en;
    case "ja":
      return messages.ja;
    case "zh-cn":
    default:
      return messages.zh;
  }
};

let refreshPromise: Promise<any> | null = null;

// 刷新token的API白名单
const refreshTokenWhitelist = [
  "/v1/auth/refresh", // 刷新token的接口
  "/v1/auth/login", // 登录接口
  "/v1/auth/logout", // 登出接口
];

// 判断token是否即将过期（例如，提前5分钟刷新）
const isTokenExpiringSoon = (token: any): boolean => {
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
  baseURL: env.api,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

const refreshToken = async () => {
  const token = Token.getToken();
  if (!token || !token.refreshToken) {
    throw new Error("No refresh token available");
  }
  const response = await AuthAPI.refresh(token.refreshToken);
  if (response.data) {
    Token.setToken(response.data.token);
  }
  return response.data;
};
// 请求拦截器
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
      // alert(isWhitelisted);
      //   alert(config.url);
      if (!isWhitelisted && isTokenExpiringSoon(token)) {
        try {
          if (!refreshPromise) {
            // 开始刷新并保存 Promise，其他请求可以 await 它
            refreshPromise = refreshToken();
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
        } finally {
          refreshPromise = null;
        }
      }
    }
    //alert(2222);
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

function showErrorMessage(message: string, duration = 5000) {
  ElMessage.error({ message, duration });
}

function handleUnauthorized(router: ReturnType<typeof useRouter>) {
  const messages = getMessageArray();

  showErrorMessage(messages[0]);
  return useUserStoreHook()
    .resetToken()
    .then(() => {
      router.push({ path: "/web/index" });
      return Promise.reject("");
    });
}

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  //
  async (error: any) => {
    const router = useRouter();
    const { response } = error;
    const messages = getMessageArray();

    if (!response) {
      if (error.message === "Network Error") {
        showErrorMessage(messages[1]);
      } else {
        console.error("未知错误", error.message);

        showErrorMessage(error.message);
      }
      return Promise.reject(error);
    }
    if (response.status === 401) {
      // alert(1234);
      // 仅当身份认证失败，执行登出操作
      return handleUnauthorized(router);
    } else if (response.status >= 500) {
      console.error("服务器内部错误", response);
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
