import { defineStore } from "pinia";
import { pluginSystem } from "@/plugin-system";
import type { PluginLoadOptions } from "@/plugin-system/core/PluginLoader";
import { store } from "@/store";
import type {
  PluginAccessScope,
  PluginInfo,
  PluginsConfig,
  MenuGroup,
} from "@/plugin-system";
import { verifyPluginHostSession } from "@/plugin-system/services/hostSessionApi";
import Token from "@/store/modules/token";

type PluginAccessState =
  | "unknown"
  | "loading"
  | "visible"
  | "forbidden"
  | "degraded";

type PluginAccessResult = {
  status: PluginAccessState;
  accessScope: PluginAccessScope | null;
};

type HostSessionSnapshot = {
  authenticated: boolean;
  roles: string[];
};

const DEFAULT_ACCESS_SCOPE: PluginAccessScope = "auth-only";
const inFlightPluginAccessRequests = new Map<
  string,
  Promise<PluginAccessResult>
>();
const inFlightHostSessionRequests = new Map<
  string,
  Promise<HostSessionSnapshot>
>();

function buildTokenFingerprint(accessToken?: string): string {
  if (!accessToken) {
    return "anonymous";
  }

  let hash = 5381;
  for (let i = 0; i < accessToken.length; i += 1) {
    hash = (hash * 33) ^ accessToken.charCodeAt(i);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeAccessScope(
  value: unknown
): PluginAccessScope {
  return value === "admin-only" ||
    value === "manager-only" ||
    value === "root-only"
    ? value
    : DEFAULT_ACCESS_SCOPE;
}

function isStableAccessState(
  status: PluginAccessState
): status is "visible" | "forbidden" {
  return status === "visible" || status === "forbidden";
}

function getCurrentTokenFingerprint() {
  return buildTokenFingerprint(Token.getToken()?.accessToken);
}

function isVisibleForScope(
  accessScope: PluginAccessScope,
  session: HostSessionSnapshot
): boolean {
  if (!session.authenticated) {
    return false;
  }

  const roles = session.roles;
  switch (accessScope) {
    case "root-only":
      return roles.includes("root");
    case "manager-only":
      return roles.includes("root") || roles.includes("manager");
    case "admin-only":
      return roles.includes("root") || roles.includes("admin");
    default:
      return true;
  }
}

interface PluginSystemState {
  initialized: boolean;
  config: PluginsConfig | null;
  plugins: Map<string, PluginInfo>;
  activePluginId: string | null;
  loading: boolean;
  error: string | null;
  pluginAccessScopes: Record<string, PluginAccessScope | null>;
  pluginAccessStates: Record<string, PluginAccessState>;
  pluginPermissionFingerprints: Record<string, string>;
  hostSessionFingerprint: string | null;
  hostSessionRoles: string[];
  hostSessionAuthenticated: boolean;
  hostSessionResolved: boolean;
}

function buildPluginAccessRequestKey(pluginId: string, fingerprint: string) {
  return `${pluginId}:${fingerprint}`;
}

function getCurrentTokenAwarePluginAccess(
  state: Pick<
    PluginSystemState,
    "pluginAccessScopes" | "pluginAccessStates" | "pluginPermissionFingerprints"
  >,
  pluginId: string
): PluginAccessResult {
  const status = state.pluginAccessStates[pluginId] ?? "unknown";
  const currentFingerprint = getCurrentTokenFingerprint();
  const cachedFingerprint = state.pluginPermissionFingerprints[pluginId];

  if (cachedFingerprint === currentFingerprint) {
    return {
      status,
      accessScope:
        status === "loading" ? null : (state.pluginAccessScopes[pluginId] ?? null),
    };
  }

  if (
    inFlightPluginAccessRequests.has(
      buildPluginAccessRequestKey(pluginId, currentFingerprint)
    )
  ) {
    return {
      status: "loading",
      accessScope: null,
    };
  }

  return {
    status: "unknown",
    accessScope: null,
  };
}

export const usePluginSystemStore = defineStore("plugin-system", {
  state: (): PluginSystemState => ({
    initialized: false,
    config: null,
    plugins: new Map(),
    activePluginId: null,
    loading: false,
    error: null,
    pluginAccessScopes: {},
    pluginAccessStates: {},
    pluginPermissionFingerprints: {},
    hostSessionFingerprint: null,
    hostSessionRoles: [],
    hostSessionAuthenticated: false,
    hostSessionResolved: false,
  }),

  getters: {
    activePlugin(state): PluginInfo | undefined {
      return state.activePluginId
        ? state.plugins.get(state.activePluginId)
        : undefined;
    },

    pluginsByGroup(state): Map<string, PluginInfo[]> {
      const grouped = new Map<string, PluginInfo[]>();
      for (const plugin of state.plugins.values()) {
        if (!plugin.enabled) continue;
        if (
          getCurrentTokenAwarePluginAccess(state, plugin.pluginId).status !==
          "visible"
        ) {
          continue;
        }

        const list = grouped.get(plugin.group) ?? [];
        list.push(plugin);
        grouped.set(plugin.group, list);
      }
      for (const [group, list] of grouped) {
        grouped.set(
          group,
          list.sort((a, b) => a.order - b.order)
        );
      }
      return grouped;
    },

    configuredEnabledPlugins(state): PluginInfo[] {
      return Array.from(state.plugins.values()).filter((p) => p.enabled);
    },

    hasConfiguredEnabledPlugins(): boolean {
      return this.configuredEnabledPlugins.length > 0;
    },

    enabledPlugins(state): PluginInfo[] {
      return Array.from(state.plugins.values()).filter(
        (plugin) =>
          plugin.enabled &&
          getCurrentTokenAwarePluginAccess(state, plugin.pluginId).status ===
            "visible"
      );
    },

    currentTokenPluginAccessStates(state): Record<string, PluginAccessState> {
      const accessStates: Record<string, PluginAccessState> = {};

      for (const pluginId of Object.keys(state.pluginAccessStates)) {
        accessStates[pluginId] = getCurrentTokenAwarePluginAccess(
          state,
          pluginId
        ).status;
      }

      return accessStates;
    },

    currentTokenPluginAccessScopes(
      state
    ): Record<string, PluginAccessScope | null> {
      const accessScopes: Record<string, PluginAccessScope | null> = {};

      for (const pluginId of Object.keys(state.pluginAccessStates)) {
        accessScopes[pluginId] = getCurrentTokenAwarePluginAccess(
          state,
          pluginId
        ).accessScope;
      }

      return accessScopes;
    },

    menuGroups(state): MenuGroup[] {
      return [...(state.config?.menuGroups ?? [])].sort(
        (a, b) => a.order - b.order
      );
    },
  },

  actions: {
    async init() {
      if (this.initialized) return;
      this.loading = true;
      this.error = null;
      try {
        await pluginSystem.initialize();
        this.initialized = true;
        this.config = pluginSystem.getConfig();
        const manifestAccessScopes = new Map(
          (this.config?.plugins ?? []).map((plugin: { id: string; accessScope?: PluginAccessScope }) => [
            plugin.id,
            normalizeAccessScope(plugin.accessScope),
          ])
        );
        const pluginsMap = new Map<string, PluginInfo>();
        for (const p of pluginSystem.getAllPlugins()) {
          pluginsMap.set(p.pluginId, p);
          this.pluginAccessScopes[p.pluginId] =
            manifestAccessScopes.get(p.pluginId) ?? DEFAULT_ACCESS_SCOPE;
          this.pluginAccessStates[p.pluginId] = "unknown";
        }
        this.plugins = pluginsMap;
      } catch (err: unknown) {
        this.error =
          err instanceof Error
            ? err.message
            : "Failed to initialize plugin system";
      } finally {
        this.loading = false;
      }
    },

    async resolveHostSession(
      fingerprint: string,
      options: { force?: boolean } = {}
    ): Promise<HostSessionSnapshot> {
      if (
        !options.force &&
        this.hostSessionResolved &&
        this.hostSessionFingerprint === fingerprint
      ) {
        return {
          authenticated: this.hostSessionAuthenticated,
          roles: this.hostSessionRoles,
        };
      }

      if (!options.force) {
        const inFlightRequest = inFlightHostSessionRequests.get(fingerprint);
        if (inFlightRequest) {
          return inFlightRequest;
        }
      }

      const token = Token.getToken();
      if (!token?.accessToken) {
        const guestSession = { authenticated: false, roles: [] as string[] };
        this.hostSessionFingerprint = fingerprint;
        this.hostSessionRoles = guestSession.roles;
        this.hostSessionAuthenticated = guestSession.authenticated;
        this.hostSessionResolved = true;
        return guestSession;
      }

      const sessionRequest = (async (): Promise<HostSessionSnapshot> => {
        const response = await verifyPluginHostSession();
        const payload =
          (response.data as { data?: { roles?: unknown } }).data ??
          (response.data as { roles?: unknown });
        const roles = Array.isArray(payload?.roles)
          ? payload.roles.filter(
              (role): role is string =>
                typeof role === "string" && role.trim().length > 0
            )
          : [];

        const session = {
          authenticated: true,
          roles,
        };

        this.hostSessionFingerprint = fingerprint;
        this.hostSessionRoles = roles;
        this.hostSessionAuthenticated = true;
        this.hostSessionResolved = true;
        return session;
      })();

      if (!options.force) {
        inFlightHostSessionRequests.set(fingerprint, sessionRequest);
      }

      try {
        return await sessionRequest;
      } finally {
        if (!options.force) {
          inFlightHostSessionRequests.delete(fingerprint);
        }
      }
    },

    async ensurePluginAccess(
      pluginId: string,
      options: { force?: boolean } = {}
    ) {
      const fingerprint = getCurrentTokenFingerprint();
      const status = this.pluginAccessStates[pluginId] ?? "unknown";
      const requestKey = buildPluginAccessRequestKey(pluginId, fingerprint);

      const handoffToCurrentTokenAccess = () => {
        if (getCurrentTokenFingerprint() === fingerprint) {
          return {
            status: this.pluginAccessStates[pluginId] ?? "unknown",
            accessScope: this.pluginAccessScopes[pluginId] ?? null,
          };
        }

        return this.ensurePluginAccess(pluginId);
      };

      if (
        !options.force &&
        this.pluginPermissionFingerprints[pluginId] === fingerprint &&
        isStableAccessState(status)
      ) {
        return {
          status,
          accessScope: this.pluginAccessScopes[pluginId] ?? null,
        };
      }

      if (!options.force) {
        const inFlightRequest = inFlightPluginAccessRequests.get(requestKey);
        if (inFlightRequest) {
          return inFlightRequest;
        }
      }

      const accessRequest = (async (): Promise<PluginAccessResult> => {
        this.pluginAccessStates[pluginId] = "loading";

        try {
          const session = await this.resolveHostSession(fingerprint, options);

          if (getCurrentTokenFingerprint() !== fingerprint) {
            return handoffToCurrentTokenAccess();
          }

          const accessScope =
            this.pluginAccessScopes[pluginId] ?? DEFAULT_ACCESS_SCOPE;
          this.pluginAccessScopes[pluginId] = accessScope;
          this.pluginPermissionFingerprints[pluginId] = fingerprint;
          this.pluginAccessStates[pluginId] = isVisibleForScope(
            accessScope,
            session
          )
            ? "visible"
            : "forbidden";
        } catch (err) {
          const errorStatus = (err as { response?: { status?: number } })
            .response?.status;

          if (getCurrentTokenFingerprint() !== fingerprint) {
            return handoffToCurrentTokenAccess();
          }

          if (errorStatus === 401) {
            throw err;
          }

          this.pluginPermissionFingerprints[pluginId] = fingerprint;
          this.pluginAccessStates[pluginId] = "degraded";
        } finally {
          if (!options.force) {
            inFlightPluginAccessRequests.delete(requestKey);
          }
        }

        return {
          status: this.pluginAccessStates[pluginId],
          accessScope: this.pluginAccessScopes[pluginId] ?? null,
        };
      })();

      if (!options.force) {
        inFlightPluginAccessRequests.set(requestKey, accessRequest);
      }

      return accessRequest;
    },

    async ensureAllEnabledPluginAccess() {
      for (const plugin of this.configuredEnabledPlugins) {
        try {
          await this.ensurePluginAccess(plugin.pluginId);
        } catch (err) {
          const errorStatus = (err as { response?: { status?: number } })
            .response?.status;

          if (errorStatus === 401) {
            return;
          }

          throw err;
        }
      }
    },

    async activatePlugin(
      pluginId: string,
      container: HTMLElement,
      options?: PluginLoadOptions
    ) {
      this.loading = true;
      this.error = null;
      try {
        await pluginSystem.loadPlugin(pluginId, container, options);
        const info = this.plugins.get(pluginId);
        if (info) {
          info.state = pluginSystem.getPluginState(pluginId);
          info.lastError = undefined;
        }
        this.activePluginId = pluginId;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to activate plugin "${pluginId}"`;
        this.error = message;
        const info = this.plugins.get(pluginId);
        if (info) {
          info.state = "error";
          info.lastError = message;
        }
      } finally {
        this.loading = false;
      }
    },

    async deactivatePlugin(pluginId: string) {
      try {
        await pluginSystem.unloadPlugin(pluginId);
        const info = this.plugins.get(pluginId);
        if (info) {
          info.state = "unloaded";
          info.lastError = undefined;
        }
        if (this.activePluginId === pluginId) {
          this.activePluginId = null;
        }
      } catch (err: unknown) {
        this.error =
          err instanceof Error
            ? err.message
            : `Failed to deactivate plugin "${pluginId}"`;
      }
    },

    async refreshConfig() {
      this.loading = true;
      this.error = null;
      try {
        await pluginSystem.destroy();
        this.initialized = false;
        this.plugins = new Map();
        this.activePluginId = null;
        this.pluginAccessScopes = {};
        this.pluginAccessStates = {};
        this.pluginPermissionFingerprints = {};
        this.hostSessionFingerprint = null;
        this.hostSessionRoles = [];
        this.hostSessionAuthenticated = false;
        this.hostSessionResolved = false;
        inFlightPluginAccessRequests.clear();
        inFlightHostSessionRequests.clear();
        await this.init();
      } catch (err: unknown) {
        this.error =
          err instanceof Error
            ? err.message
            : "Failed to refresh plugin config";
      } finally {
        this.loading = false;
      }
    },
  },
});

/** 非 setup 上下文使用 */
export function usePluginSystemStoreHook() {
  return usePluginSystemStore(store);
}
