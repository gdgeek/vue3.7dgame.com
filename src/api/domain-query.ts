import { logger } from "@/utils/logger";
import axios from "axios";
import env from "@/environment";
import qs from "querystringify";

export interface DomainDefaultInfo {
  homepage: string;
  lang: string;
  style: number;
  blog: string;
  icon: string;
}

export interface DomainLanguageInfo {
  domain: string;
  title: string;
  description: string;
  keywords: string;
  author: string;
  links: {
    name: string;
    url: string;
  }[];
}

// --- Failover Configuration ---
const PRIMARY_API = env.domain_info;
const BACKUP_API = env.domain_info_backup;

let currentApi = PRIMARY_API;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

const service = axios.create({
  baseURL: currentApi,
  timeout: 10000, // Short timeout for public query
});

function startHealthCheck() {
  if (healthCheckTimer || !PRIMARY_API) return;

  healthCheckTimer = setInterval(async () => {
    try {
      await axios.get(`${PRIMARY_API}/api/health`, { timeout: 3000 });
      logger.info("[Domain API] Primary restored, switching back.");
      currentApi = PRIMARY_API;
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
      }
    } catch {
      // Still down
    }
  }, 30000);
}

// Request Interceptor: Dynamic Base URL
service.interceptors.request.use((config) => {
  if (currentApi && !config.baseURL?.startsWith("http")) {
    config.baseURL = currentApi;
  }
  return config;
});

// Response Interceptor: Failover Logic
// 注意：后端响应格式为 { domain, data: { ... } }（两层结构）
// 这里返回 response.data（即整个响应 JSON），调用方再取 .data 拿实际数据
// 例如：getDomainDefault() 返回 { domain, data: DomainDefaultInfo }
//       store 中再读 response.data 才得到 DomainDefaultInfo
service.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { config, response } = error;

    if (
      !response &&
      config &&
      !config._retry &&
      BACKUP_API &&
      currentApi === PRIMARY_API
    ) {
      logger.warn("[Domain API] Primary unreachable, switching to backup.");
      currentApi = BACKUP_API;
      config._retry = true;
      config.baseURL = currentApi;
      startHealthCheck();
      return service(config);
    }
    return Promise.reject(error);
  }
);

/**
 * 获取域名配置信息
 * @param domain 域名 (默认当前域名)
 * @param lang 语言代码
 */
export const getDomainDefault = (domain?: string) => {
  const query = {
    domain: domain || window.location.hostname,
  };
  return service.get(`/api/query/default${qs.stringify(query, true)}`);
};

/**
 * 获取域名配置信息
 * @param domain 域名 (默认当前域名)
 * @param lang 语言代码
 */
export const getDomainLanguage = (domain?: string, lang?: string) => {
  const query = {
    domain: domain || window.location.hostname,
    lang: lang || "zh-CN",
  };
  return service.get(`/api/query/language${qs.stringify(query, true)}`);
};


