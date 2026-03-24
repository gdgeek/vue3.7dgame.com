/*
function mrpp(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "mrpp.com";
}

function mrcn(): boolean {
  return (
    import.meta.env.VITE_APP_BASE_MODE === "01xr.com" ||
    import.meta.env.VITE_APP_BASE_MODE === "7dgame.com"
  );
}*/

/*
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
  return ""; // Fallback to domainStore.author
}
*/

const environment = {
  api: import.meta.env.DEV ? import.meta.env.VITE_APP_API_URL || "" : "/api",
  doc: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOC_API || ""
    : "/api-doc",
  blockly:
    (window as unknown as Record<string, Record<string, string>>).__ENV__
      ?.BLOCKLY_URL ||
    import.meta.env.VITE_APP_BLOCKLY_URL ||
    "",
  editor:
    (window as unknown as Record<string, Record<string, string>>).__ENV__
      ?.EDITOR_URL ||
    import.meta.env.VITE_APP_EDITOR_URL ||
    "",
  domain_info: import.meta.env.DEV
    ? import.meta.env.VITE_APP_DOMAIN_INFO_API_URL || ""
    : "/api-domain",
  version: 1,
  buildVersion: import.meta.env.VITE_DEV_DATE || Date.now().toString(),
  subtitle: () => "支持Rokid设备",
  useCloud: () => import.meta.env.VITE_APP_BASE_MODE !== "local",
  local: () => import.meta.env.VITE_APP_BASE_MODE === "local",
  /** 替换 API URL 中的 IP（兼容旧代码，目前直接返回原 URL） */
  replaceIP: (url: string) => url,
};

export default environment;
