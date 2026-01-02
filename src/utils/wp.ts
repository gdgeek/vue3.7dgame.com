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
const getMessageArray = () => {
  return [
    i18n.global.t("request.loginExpired"),
    i18n.global.t("request.networkError"),
    i18n.global.t("request.serverError"),
  ];
};

// 创建一个 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_DOC_API,
  timeout: 50000,
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
  ElMessage.error({ message, duration });
}

// 处理身份认证失败
function handleUnauthorized(router: ReturnType<typeof useRouter>) {
  const messages = getMessageArray();
  showErrorMessage(messages[0]);
  router.push({ path: "/site/login" });
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
