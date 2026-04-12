const SYSTEM_ADMIN_API_BASE = (
  import.meta.env.VITE_SYSTEM_ADMIN_API_URL || "http://localhost:8088/api"
).replace(/\/$/, "");

export function buildSystemAdminUrl(path: string): string {
  return `${SYSTEM_ADMIN_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
