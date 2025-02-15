import { GetIP, ReplaceIP, ReplaceURL } from "./utils/helper";
function useCloud(): boolean {
  // alert(import.meta.env.VITE_APP_BASE_MODE);
  return import.meta.env.VITE_APP_BASE_MODE !== "local";
}

function mrpp(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "mrpp.com";
}

function mrcn(): boolean {
  return (
    import.meta.env.VITE_APP_BASE_MODE === "01xr.com" ||
    import.meta.env.VITE_APP_BASE_MODE === "7dgame.com"
  );
}

function local(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "local";
}

function getIP(): string | null {
  const reg = /^([^:]+)/g;
  const ret = reg.exec(window.location.host);
  if (ret !== null) {
    return ret[1];
  }
  return null;
}

function title(): string {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.includes("mrpp.com")) {
    return "不加班官方网站";
  }
  if (hostname.includes("01xr.com")) {
    return "不加班官方网站";
  }
  if (hostname.includes("hololens2.cn")) {
    return "上海不加班网络科技";
  }
  if (hostname.includes("bujiaban.com")) {
    return "不加班AR编程";
  }
  if (hostname.includes("localhost")) {
    return "不加班AR编程";
  }
  if (hostname.includes("7dgame.com")) {
    return "不加班官方网站";
  }
  return "上海不加班网络科技有限公司";
}

function subtitle(): string {
  switch (import.meta.env.VITE_APP_BASE_MODE) {
    case "01xr.com":
      return "内部版本";
    case "7dgame.com":
      return "测试版本";
    case "local":
      return "私有部署版本";
    default:
      return "公测版本";
  }
}

const environment = {
  ip: GetIP(),
  api: ReplaceURL(import.meta.env.VITE_APP_BASE_API || ""),
  doc: ReplaceURL(import.meta.env.VITE_APP_DOC_API || ""),
  blockly: ReplaceURL(import.meta.env.VITE_APP_BLOCKLY_URL || ""),
  editor: ReplaceURL(import.meta.env.VITE_APP_EDITOR_URL || ""),
  auth_api: ReplaceURL(import.meta.env.VITE_APP_AUTH_API || ""),
  ai: ReplaceURL(import.meta.env.VIET_APP_AI_API || ""),
  base: ReplaceURL(import.meta.env.VIET_APP_BASE_URL || ""),
  version: 3,
  subtitle,
  title,
  useCloud,
  mrcn,
  mrpp,
  local,
  replaceIP: ReplaceIP,
};

export default environment;
