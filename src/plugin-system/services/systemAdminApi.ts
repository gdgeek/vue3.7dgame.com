import environment from "@/environment";

const SYSTEM_ADMIN_API_BASE = (environment.config_api || "").replace(/\/$/, "");

export function buildSystemAdminUrl(path: string): string {
  return `${SYSTEM_ADMIN_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
