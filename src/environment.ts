function canRegister(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "mrpp.com";
}

function useCloud(): boolean {
  // alert(import.meta.env.VITE_APP_BASE_MODE);
  return import.meta.env.VITE_APP_BASE_MODE !== "local";
}

function canDocument(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE !== "local";
}

function canWeb(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "mrpp.com";
}

function canBlog(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "7dgame.com";
}

function canStory(): boolean {
  return (
    import.meta.env.VITE_APP_BASE_MODE === "local" ||
    import.meta.env.VITE_APP_BASE_MODE === "7dgame.com"
  );
}

function canSetup(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "local";
}

function mrpp(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "mrpp.com";
}

function mrcn(): boolean {
  return (
    import.meta.env.VITE_APP_BASE_MODE === "4mr.cn" ||
    import.meta.env.VITE_APP_BASE_MODE === "7dgame.com"
  );
}

function local(): boolean {
  return import.meta.env.VITE_APP_BASE_MODE === "local";
}

function canManager(): boolean {
  return (
    import.meta.env.VITE_APP_BASE_MODE === "local" ||
    import.meta.env.VITE_APP_BASE_MODE === "4mr.cn" ||
    import.meta.env.VITE_APP_BASE_MODE === "7dgame.com"
  );
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
  if (hostname.includes("4mr.cn")) {
    return "不加班官方网站";
  }
  if (hostname.includes("hololens2.cn")) {
    return "上海不加班网络科技";
  }
  if (hostname.includes("bujiaban.com")) {
    return "混合现实编程";
  }
  if (hostname.includes("localhost")) {
    return "混合现实编程";
  }
  if (hostname.includes("7dgame.com")) {
    return "不加班官方网站";
  }
  return "上海不加班网络科技有限公司";
}

function subtitle(): string {
  switch (import.meta.env.VITE_APP_BASE_MODE) {
    case "4mr.cn":
      return "内部版本";
    case "7dgame.com":
      return "测试版本";
    case "local":
      return "私有部署版本";
    default:
      return "公测版本";
  }
}

function replaceIP(input: string): string {
  return input.replace("[ip]", getIP() || "");
}

const environment = {
  Local: !!import.meta.env.VITE_APP_LOCAL,
  mode: import.meta.env.VITE_APP_BASE_MODE || "",
  ip: getIP(),
  api: import.meta.env.VITE_APP_BASE_API || "",
  doc: import.meta.env.VITE_APP_DOC_API || "",
  version: 3,
  canRegister,
  canWeb,
  canBlog,
  canSetup,
  canStory,
  subtitle,
  title,
  canManager,
  useCloud,
  canDocument,
  mrcn,
  mrpp,
  local,
  replaceIP,
};

export default environment;
