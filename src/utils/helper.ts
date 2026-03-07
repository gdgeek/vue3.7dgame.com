import { logger } from "@/utils/logger";
export type MessageType = {
  action: string;
  data: unknown;
};
export function GetCurrentUrl() {
  const fullUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}`;
  logger.log(`Full URL: ${fullUrl}`);
  return fullUrl;
}

export function GetIP(): string | null {
  const reg = /^([^:]+)/g;
  const ret = reg.exec(window.location.host);
  if (ret !== null) {
    return ret[1];
  }
  return null;
}
export function GetDomain(): string {
  {
    const hostname = window.location.hostname;

    // 检查是否是 IP 地址或 localhost
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost") {
      return hostname;
    }

    const domainParts = hostname.split(".");
    // 如果第一部分是www，则移除它
    if (domainParts[0] === "www") {
      domainParts.shift();
    }
    return domainParts.join(".");
  }
}

export function ReplaceIP(input: string): string {
  return input.replace("{ip}", GetIP() || "");
}

export function ReplaceURL(input: string): string {
  input = input.replace("{domain}", GetDomain());
  input = input.replace("{ip}", GetIP() || "");
  input = input.replace("{scheme}", GetScheme());
  return input;
}
function GetScheme(): string {
  return window.location.protocol;
}

export function getVueAppleLoginConfig() {
  return {
    clientId: "com.mrpp.www",
    scope: "name email",
    redirectURI: GetCurrentUrl(),
    state: Date.now().toString(),
    usePopup: true,
  };
}

/**
 * Normalize a URL's protocol to match the current page's protocol.
 * e.g. on HTTPS pages, http:// URLs become https://; on HTTP pages, https:// becomes http://.
 * Safe to call with any value (returns empty string for null/undefined).
 * Falls back to https in non-browser environments.
 */
export function toHttps(url: string | null | undefined): string {
  if (!url) return url ?? "";
  const currentProtocol =
    typeof window !== "undefined" ? window.location.protocol : "https:";
  return url.replace(/^https?:/, currentProtocol);
}
