import env from "@/environment";
import qs from "querystringify";
import axios from "axios";

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

// Nginx 层已处理 /api-domain/ 的 failover，前端不再需要主备切换
const service = axios.create({
  baseURL: env.domain_info,
  timeout: 10000,
});

// 提取 response.data，与原有行为保持一致
service.interceptors.response.use((response) => response.data);

/**
 * 获取域名配置信息
 * @param domain 域名 (默认当前域名)
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
