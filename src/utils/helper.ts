export type MessageType = {
  action: string;
  data: any;
};
export function GetCurrentUrl() {
  const fullUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}`;
  console.log(`Full URL: ${fullUrl}`);
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

export const VueAppleLoginConfig = {
  clientId: "com.mrpp.www",
  scope: "name email",
  redirectURI: GetCurrentUrl(),
  state: Date.now().toString(),
  usePopup: true,
};
