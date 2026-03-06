import axios, { AxiosInstance, CreateAxiosDefaults } from "axios";
import { logger } from "@/utils/logger";

export interface FailoverOptions {
  /** 主 API URL */
  primaryUrl: string;
  /** 备用 API URL */
  backupUrl: string;
  /** 健康检查路径，默认为 /health */
  healthPath?: string;
  /** 传递给 axios.create 的其他配置 */
  axiosConfig?: CreateAxiosDefaults;
  /** 日志前缀标识，如 "[API Failover]" */
  logTag?: string;
}

/**
 * 创建带主备切换能力的 Axios 实例。
 * 当主 API 请求失败时自动切换到备用 API，并定期轮询恢复主 API。
 */
export function createFailoverAxios(options: FailoverOptions): AxiosInstance {
  const {
    primaryUrl,
    backupUrl,
    healthPath = "/health",
    axiosConfig = {},
    logTag = "[Failover]",
  } = options;

  let currentApi = primaryUrl;
  let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  const service = axios.create({
    baseURL: currentApi,
    ...axiosConfig,
  });

  function startHealthCheck() {
    if (healthCheckTimer || !primaryUrl) return;

    healthCheckTimer = setInterval(async () => {
      try {
        await axios.get(`${primaryUrl}${healthPath}`, { timeout: 3000 });
        logger.info(`${logTag} Primary API restored, switching back.`);
        currentApi = primaryUrl;
        if (healthCheckTimer) {
          clearInterval(healthCheckTimer);
          healthCheckTimer = null;
        }
      } catch {
        // Primary still down
      }
    }, 30000);
  }

  // 动态更新 baseURL
  service.interceptors.request.use((config) => {
    if (currentApi && !config.baseURL?.startsWith("http")) {
      config.baseURL = currentApi;
    }
    return config;
  });

  // 主备切换响应拦截
  service.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;

      if (
        !response &&
        config &&
        !config._retry &&
        backupUrl &&
        currentApi === primaryUrl
      ) {
        logger.warn(`${logTag} Primary unreachable, switching to backup.`);
        currentApi = backupUrl;
        config._retry = true;
        config.baseURL = currentApi;
        startHealthCheck();
        return service(config);
      }
      return Promise.reject(error);
    }
  );

  return service;
}
