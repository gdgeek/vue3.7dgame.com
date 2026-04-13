import { defineStore } from "pinia";
import { pluginSystem } from "@/plugin-system";
import type { PluginLoadOptions } from "@/plugin-system/core/PluginLoader";
import { store } from "@/store";
import type { PluginInfo, PluginsConfig, MenuGroup } from "@/plugin-system";
import { getSystemAdminAllowedActions } from "@/plugin-system/services/systemAdminApi";
import { probeHostSession } from "@/plugin-system/services/hostSessionApi";
import Token from "@/store/modules/token";

type PluginAccessState =
  | "unknown"
  | "loading"
  | "visible"
  | "forbidden"
  | "degraded";

type PluginAccessResult = {
  status: PluginAccessState;
  actions: string[];
};

const inFlightPluginAccessRequests = new Map<string, Promise<PluginAccessResult>>();

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

async function requestPluginAccessWithRetry(pluginId: string) {
  try {
    return await getSystemAdminAllowedActions(pluginId);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    const shouldRetry = status == null || status >= 500;

    if (!shouldRetry) {
      throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    return getSystemAdminAllowedActions(pluginId);
  }
}

function isStableAccessState(
  status: PluginAccessState
): status is "visible" | "forbidden" {
  return status === "visible" || status === "forbidden";
}

function getCurrentTokenFingerprint() {
  return buildTokenFingerprint(Token.getToken()?.accessToken);
}

interface PluginSystemState {
  initialized: boolean;
  config: PluginsConfig | null;
  plugins: Map<string, PluginInfo>;
  activePluginId: string | null;
  loading: boolean;
  error: string | null;
  /** 每个插件的允许操作列表，key 为 pluginId */
  pluginPermissions: Record<string, string[]>;
  pluginAccessStates: Record<string, PluginAccessState>;
  pluginPermissionFingerprints: Record<string, string>;
}

function buildPluginAccessRequestKey(pluginId: string, fingerprint: string) {
  return `${pluginId}:${fingerprint}`;
}

function getCurrentTokenAwarePluginAccess(
  state: Pick<
    PluginSystemState,
    "pluginPermissions" | "pluginAccessStates" | "pluginPermissionFingerprints"
  >,
  pluginId: string
): PluginAccessResult {
  const status = state.pluginAccessStates[pluginId] ?? "unknown";
  const currentFingerprint = getCurrentTokenFingerprint();
  const cachedFingerprint = state.pluginPermissionFingerprints[pluginId];

  if (cachedFingerprint === currentFingerprint) {
    return {
      status,
      actions:
        status === "loading" ? [] : state.pluginPermissions[pluginId] ?? [],
    };
  }

  if (
    inFlightPluginAccessRequests.has(
      buildPluginAccessRequestKey(pluginId, currentFingerprint)
    )
  ) {
    return {
      status: "loading",
      actions: [],
    };
  }

  return {
    status: "unknown",
    actions: [],
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
    pluginPermissions: {},
    pluginAccessStates: {},
    pluginPermissionFingerprints: {},
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

    currentTokenPluginPermissions(state): Record<string, string[]> {
      const permissions: Record<string, string[]> = {};

      for (const pluginId of Object.keys(state.pluginAccessStates)) {
        permissions[pluginId] = getCurrentTokenAwarePluginAccess(
          state,
          pluginId
        ).actions;
      }

      return permissions;
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
        const pluginsMap = new Map<string, PluginInfo>();
        for (const p of pluginSystem.getAllPlugins()) {
          pluginsMap.set(p.pluginId, p);
          this.pluginPermissions[p.pluginId] = [];
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

    async ensurePluginAccess(
      pluginId: string,
      options: { force?: boolean } = {}
    ) {
      const token = Token.getToken();
      const fingerprint = buildTokenFingerprint(token?.accessToken);
      const status = this.pluginAccessStates[pluginId] ?? "unknown";
      const requestKey = buildPluginAccessRequestKey(pluginId, fingerprint);

      const handoffToCurrentTokenAccess = () => {
        if (getCurrentTokenFingerprint() === fingerprint) {
          return {
            status: this.pluginAccessStates[pluginId] ?? "unknown",
            actions: this.pluginPermissions[pluginId] ?? [],
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
          actions: this.pluginPermissions[pluginId] ?? [],
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
          const res = await requestPluginAccessWithRetry(pluginId);
          const actions =
            res.data?.code === 0 ? res.data.data?.actions ?? [] : [];

          if (getCurrentTokenFingerprint() !== fingerprint) {
            return handoffToCurrentTokenAccess();
          }

          this.pluginPermissions[pluginId] = actions;
          this.pluginPermissionFingerprints[pluginId] = fingerprint;
          this.pluginAccessStates[pluginId] =
            actions.length > 0 ? "visible" : "forbidden";
        } catch (err) {
          const errorStatus = (err as { response?: { status?: number } })
            .response?.status;

          if (getCurrentTokenFingerprint() !== fingerprint) {
            return handoffToCurrentTokenAccess();
          }

          if (errorStatus === 401) {
            try {
              await probeHostSession();
            } catch (hostErr) {
              const hostErrorStatus = (
                hostErr as { response?: { status?: number } }
              ).response?.status;

              if (hostErrorStatus === 401) {
                throw hostErr;
              }
            }

            if (getCurrentTokenFingerprint() !== fingerprint) {
              return handoffToCurrentTokenAccess();
            }
          }

          this.pluginPermissions[pluginId] = [];
          this.pluginPermissionFingerprints[pluginId] = fingerprint;
          this.pluginAccessStates[pluginId] =
            errorStatus === 403 ? "forbidden" : "degraded";
        } finally {
          if (!options.force) {
            inFlightPluginAccessRequests.delete(requestKey);
          }
        }

        return {
          status: this.pluginAccessStates[pluginId],
          actions: this.pluginPermissions[pluginId] ?? [],
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
        this.pluginPermissions = {};
        this.pluginAccessStates = {};
        this.pluginPermissionFingerprints = {};
        inFlightPluginAccessRequests.clear();
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
