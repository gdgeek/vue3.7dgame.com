import axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { ElMessage } from "element-plus";

// 创建一个 axios 实例
const service = axios.create({
  // baseURL: environment.doc, // url = base url + request url
  baseURL: import.meta.env.VITE_APP_DOC_API,
  // baseURL: "https://hololens2.cn/wp-json/wp/v2/",
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 20000, // request timeout
});

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(config);
    return config;
  },
  (error: any) => {
    // 处理请求错误
    console.log(error); // for debug
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: any) => {
    console.log("err" + error); // for debug
    ElMessage({
      message: error.message,
      type: "error",
      duration: 5 * 1000,
    });
    return Promise.reject(error.response.data);
  }
);

export default service;
