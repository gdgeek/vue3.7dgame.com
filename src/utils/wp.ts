import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useUserStoreHook } from "@/store/modules/user";
import { useRouter } from "vue-router";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import i18n from "@/lang";

// 获取当前语言
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
    case "zh-cn":
    default:
      return messages.zh;
  }
};

// 创建一个 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_DOC_API,
  timeout: 20000,
});

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// 显示错误消息
function showErrorMessage(message: string, duration = 5000) {
  ElMessage({
    message,
    type: "error",
    duration,
  });
}

// 处理身份认证失败
function handleUnauthorized(router: ReturnType<typeof useRouter>) {
  const messages = getMessageArray();
  showErrorMessage(messages[0]);
  router.push({ path: "/login" });
  return Promise.reject("");
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

        // 自动尝试重新登录
        try {
          await useUserStoreHook().resetToken(); // 重新获取 Token
          const accessToken = localStorage.getItem(TOKEN_KEY);
          if (accessToken) {
            // 更新请求头并重发请求
            error.config.headers.Authorization = accessToken;
            return service(error.config);
          }
        } catch (loginError) {
          showErrorMessage("Automatic re-login failed");
          router.push({ path: "/login" });
          return Promise.reject(loginError);
        }
      } else {
        showErrorMessage(error.message);
      }
      return Promise.reject(error);
    }

    if (response.status === 401) {
      // 处理 401 身份认证失败
      return handleUnauthorized(router);
    } else if (response.status >= 500) {
      // 处理服务器错误
      showErrorMessage(messages[2]);
    } else {
      const message = response.data.message || error.message;
      showErrorMessage(message);
    }

    return Promise.reject(response);
  }
);

export default service;
