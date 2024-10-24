import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useUserStoreHook } from "@/store/modules/user";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { useRouter } from "@/router";
import i18n from "@/lang";
import { ElMessage } from "element-plus";
import AuthAPI from "@/api/auth";

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

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

function isTokenExpiringSoon(token: string, bufferTime = 300): boolean {
  // 移除 Bearer 前缀
  const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
  const payload = JSON.parse(atob(cleanToken.split(".")[1])); // 解码token
  const currentTime = Math.floor(Date.now() / 1000); // 当前时间的 Unix 时间戳
  const tokenExpiryTime = payload.exp; // 过期时间

  // 如果当前时间 + 缓冲时间 >= token 过期时间，则表示快要过期
  return currentTime + bufferTime >= tokenExpiryTime;
}

// 请求拦截器
service.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    if (accessToken) {
      // config.headers.Authorization = accessToken;
      if (isTokenExpiringSoon(accessToken)) {
        const res = await AuthAPI.login(useUserStoreHook().form);
        const newToken = res.data.auth;
        localStorage.setItem(TOKEN_KEY, "Bearer" + " " + newToken);
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`; // 更新请求头中的 Token
        }
      } else {
        config.headers.Authorization = accessToken; // 使用当前 Token
      }
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

function showErrorMessage(message: string, duration = 5000) {
  ElMessage({
    message,
    type: "error",
    duration,
  });
}

function handleUnauthorized(router: ReturnType<typeof useRouter>) {
  const messages = getMessageArray();
  showErrorMessage(messages[0]);
  return useUserStoreHook()
    .resetToken()
    .then(() => {
      router.push({ path: "/login" });
      return Promise.reject("");
    });
}

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: any) => {
    const router = useRouter();
    const { response } = error;
    const messages = getMessageArray();

    if (!response) {
      if (error.message === "Network Error") {
        showErrorMessage(messages[1]);
      } else {
        showErrorMessage(error.message);
      }
      return Promise.reject(error);
    }

    if (response.status === 401) {
      // 仅当身份认证失败，执行登出操作
      return handleUnauthorized(router);
    } else if (response.status >= 500) {
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
