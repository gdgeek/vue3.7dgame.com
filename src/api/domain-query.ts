import {
  getStaticDomainDefault,
  getStaticDomainLanguage,
} from "@/api/domain-static-config";

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

function getRequestDomain(domain?: string): string {
  return domain || window.location.hostname;
}

/**
 * 获取域名配置信息
 * @param domain 域名 (默认当前域名)
 */
export const getDomainDefault = async (domain?: string) => {
  const requestDomain = getRequestDomain(domain);
  const staticResult = await getStaticDomainDefault(requestDomain);
  if (staticResult) {
    return { data: staticResult.data as unknown as DomainDefaultInfo };
  }

  throw new Error(`Static domain default config not found: ${requestDomain}`);
};

/**
 * 获取域名配置信息
 * @param domain 域名 (默认当前域名)
 * @param lang 语言代码
 */
export const getDomainLanguage = async (domain?: string, lang?: string) => {
  const requestDomain = getRequestDomain(domain);
  const requestLang = lang || "zh-CN";
  const staticResult = await getStaticDomainLanguage(
    requestDomain,
    requestLang
  );
  if (staticResult) {
    return { data: staticResult.data as unknown as DomainLanguageInfo };
  }

  throw new Error(
    `Static domain language config not found: ${requestDomain} (${requestLang})`
  );
};
