import type { LocationQueryValue, LocationQueryValueRaw } from "vue-router";

import type { PluginLoadOptions } from "@/plugin-system/core/PluginLoader";

const HOST_CONTROLLED_PLUGIN_QUERY_PARAMS = ["lang", "theme", "v", "cb"];

function getSingleQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | LocationQueryValueRaw[]
): string | null {
  return typeof value === "string" ? value : null;
}

function removeHostControlledQueryParams(pluginUrl: string): string {
  const url = new URL(pluginUrl, window.location.origin);

  for (const key of HOST_CONTROLLED_PLUGIN_QUERY_PARAMS) {
    url.searchParams.delete(key);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function normalizePluginUrlParam(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (
    /^[a-z][a-z\d+\-.]*:/i.test(trimmed) ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return removeHostControlledQueryParams(trimmed);
  }

  if (trimmed.startsWith("?") || trimmed.startsWith("#")) {
    return removeHostControlledQueryParams(`/${trimmed}`);
  }

  return removeHostControlledQueryParams(`/${trimmed}`);
}

export function normalizePluginUrlQuery(
  value:
    | LocationQueryValue
    | LocationQueryValue[]
    | LocationQueryValueRaw[]
    | undefined
): string | null {
  if (value == null) {
    return null;
  }

  return normalizePluginUrlParam(getSingleQueryValue(value));
}

export function buildPluginIframeUrl(
  baseUrl: string,
  options?: PluginLoadOptions
): string {
  const url = new URL(baseUrl, window.location.origin);
  const pluginUrl = normalizePluginUrlParam(options?.pluginUrl);

  if (pluginUrl) {
    const pluginUrlParts = new URL(pluginUrl, url.origin);
    url.pathname = pluginUrlParts.pathname;
    url.search = pluginUrlParts.search;
    url.hash = pluginUrlParts.hash;
  }

  if (options?.lang) url.searchParams.set("lang", options.lang);
  if (options?.theme) url.searchParams.set("theme", options.theme);
  if (options?.version) url.searchParams.set("v", options.version);
  if (options?.cacheBust) url.searchParams.set("cb", options.cacheBust);

  return url.toString();
}
