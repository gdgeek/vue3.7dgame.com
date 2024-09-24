import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useUserStoreHook } from "@/store/modules/user";
import { ResultEnum } from "@/enums/ResultEnum";
import { TOKEN_KEY } from "@/enums/CacheEnum";
import { useRouter } from "@/router";

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

// 响应拦截器
// service.interceptors.response.use(
//   (response: AxiosResponse) => {
//     return response;
//   },
//   (error: any) => {
//     const router = useRouter();
//     // 异常处理
//     if (
//       (typeof error.response === "undefined" &&
//         error.message === "Network Error") ||
//       (typeof error.response !== "undefined" && error.response.status === 401)
//     ) {
//       ElMessage({
//         message: "登录过期，请重新登录",
//         type: "error",
//         duration: 5 * 1000,
//       });
//       // 清除重置token
//       useUserStoreHook()
//         .resetToken()
//         .then(() => {
//           router.push({ path: "/login" });
//         });
//       return Promise.reject("");
//     } else if (error.response && error.response.status >= 500) {
//       ElMessage.error({
//         message: "服务器内部错误，请稍后再试",
//         duration: 5 * 1000,
//       });
//       return Promise.reject(error.response.data);
//     } else {
//       // alert(error.message);
//       ElMessage({
//         message: error.message,
//         type: "error",
//         duration: 5 * 1000,
//       });
//       setTimeout(() => {
//         let message = "";
//         try {
//           message = JSON.parse(error.response.data.message);
//         } catch {
//           if (typeof error.response === "undefined") {
//             message = error.message;
//           } else {
//             message = error.response.data.message;
//           }
//         }

//         ElMessage.error({
//           message: message,
//           duration: 5 * 1000,
//         });
//       }, 300);

//       return Promise.reject(error.response.data);
//     }
//   }
// );

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
  showErrorMessage("登录过期，请重新登录", router);
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
        showErrorMessage("网络错误，请检查您的网络连接", router);
      } else {
        showErrorMessage(error.message, router);
      }
      return Promise.reject(error);
    }

    if (response.status === 401) {
      return handleUnauthorized(router);
    } else if (response.status >= 500) {
      showErrorMessage("服务器内部错误，请稍后再试", router);
    } else {
      const message = response.data.message || error.message;
      showErrorMessage(message, router);
    }

    return Promise.reject(response);
  }
);

// 导出 axios 实例
export default service;
