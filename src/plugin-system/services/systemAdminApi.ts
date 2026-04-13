import type { AxiosRequestConfig, AxiosResponse } from "axios";

import environment from "@/environment";
import request from "@/utils/request";

const SYSTEM_ADMIN_API_BASE = (environment.config_api || "").replace(/\/$/, "");

export function buildSystemAdminUrl(path: string): string {
  return `${SYSTEM_ADMIN_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getSystemAdmin<T = unknown>(
  path: string,
  config?: Omit<AxiosRequestConfig, "authScope" | "baseURL">
): Promise<AxiosResponse<T>> {
  return request.get<T>(buildSystemAdminUrl(path), {
    ...config,
    authScope: "plugin",
    // The shared request instance defaults to /api; blank it here so /api-config stays intact.
    baseURL: "",
  });
}

interface SystemAdminPluginListResponse {
  data?: unknown;
}

interface SystemAdminAllowedActionsResponse {
  code?: number;
  data?: {
    actions?: string[];
  };
}

export function getSystemAdminPluginList(): Promise<
  AxiosResponse<SystemAdminPluginListResponse>
> {
  return getSystemAdmin("/v1/plugin/list", {
    skipErrorMessage: true,
  });
}

export function getSystemAdminAllowedActions(
  pluginName: string
): Promise<AxiosResponse<SystemAdminAllowedActionsResponse>> {
  return getSystemAdmin("/v1/plugin/allowed-actions", {
    params: { plugin_name: pluginName },
    skipErrorMessage: true,
  });
}
