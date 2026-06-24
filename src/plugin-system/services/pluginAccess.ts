import type { PluginAccessScope } from "@/plugin-system/types";

export type PluginAccessState =
  | "unknown"
  | "loading"
  | "visible"
  | "forbidden"
  | "degraded";

export type PluginAccessResult = {
  status: PluginAccessState;
  accessScope: PluginAccessScope | null;
};

export type HostSessionSnapshot = {
  authenticated: boolean;
  roles: string[];
};

export type PluginAccessCacheSnapshot = {
  pluginAccessScopes: Record<string, PluginAccessScope | null>;
  pluginAccessStates: Record<string, PluginAccessState>;
  pluginPermissionFingerprints: Record<string, string>;
};

export const DEFAULT_ACCESS_SCOPE: PluginAccessScope = "auth-only";

const ROLE_LEVELS: Record<string, number> = {
  root: 4,
  admin: 3,
  manager: 2,
  user: 1,
};

const REQUIRED_ACCESS_LEVELS: Record<PluginAccessScope, number> = {
  "root-only": ROLE_LEVELS.root,
  "admin-only": ROLE_LEVELS.admin,
  "manager-only": ROLE_LEVELS.manager,
  "auth-only": ROLE_LEVELS.user,
};

export function buildTokenFingerprint(accessToken?: string): string {
  if (!accessToken) return "anonymous";
  let hash = 5381;
  for (let i = 0; i < accessToken.length; i += 1) {
    hash = (hash * 33) ^ accessToken.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeAccessScope(value: unknown): PluginAccessScope {
  return value === "admin-only" ||
    value === "manager-only" ||
    value === "root-only"
    ? value
    : DEFAULT_ACCESS_SCOPE;
}

export function isStableAccessState(
  status: PluginAccessState
): status is "visible" | "forbidden" {
  return status === "visible" || status === "forbidden";
}

export function buildPluginAccessRequestKey(
  pluginId: string,
  fingerprint: string
): string {
  return `${pluginId}:${fingerprint}`;
}

export function isVisibleForScope(
  accessScope: PluginAccessScope,
  session: HostSessionSnapshot
): boolean {
  if (!session.authenticated) return false;
  const currentLevel = session.roles.reduce(
    (highestLevel, role) => Math.max(highestLevel, ROLE_LEVELS[role] ?? 0),
    0
  );
  return currentLevel >= REQUIRED_ACCESS_LEVELS[accessScope];
}

export function getTokenAwarePluginAccess(
  state: PluginAccessCacheSnapshot,
  pluginId: string,
  currentFingerprint: string,
  hasInFlightRequest: boolean
): PluginAccessResult {
  const status = state.pluginAccessStates[pluginId] ?? "unknown";
  const cachedFingerprint = state.pluginPermissionFingerprints[pluginId];

  if (cachedFingerprint === currentFingerprint) {
    return {
      status,
      accessScope:
        status === "loading"
          ? null
          : (state.pluginAccessScopes[pluginId] ?? null),
    };
  }

  if (hasInFlightRequest) {
    return { status: "loading", accessScope: null };
  }

  return { status: "unknown", accessScope: null };
}
