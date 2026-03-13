import { defineStore } from "pinia";
import { pluginSystem } from "@/plugin-system";
import { store } from "@/store";
import type { PluginInfo, PluginsConfig, MenuGroup } from "@/plugin-system";
import Token from "@/store/modules/token";
import request from "@/utils/request";

interface PluginSystemState {
  initialized: boolean;
  config: PluginsConfig | null;
  plugins: Map<string, PluginInfo>;
  activePluginId: string | null;
  loading: boolean;
  error: string | null;
  /** 每个插件的允许操作列表，key 为 pluginId */
  pluginPermissions: Record<string, string[]>;
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
        // 过滤掉没有任何权限的插件
        const actions = state.pluginPermissions[plugin.pluginId];
        if (actions !== undefined && actions.length === 0) continue;

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

    enabledPlugins(state): PluginInfo[] {
      const enabled = Array.from(state.plugins.values()).filter(
        (p) => p.enabled
      );
      // 过滤掉没有任何权限的插件
      return enabled.filter((p) => {
        const actions = state.pluginPermissions[p.pluginId];
        // 权限尚未加载时（undefined）先显示，加载完为空数组则隐藏
        return actions === undefined || actions.length > 0;
      });
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
        }
        this.plugins = pluginsMap;

        // 异步加载各插件的权限（不阻塞初始化）
        this.fetchAllPluginPermissions();
      } catch (err: unknown) {
        this.error =
          err instanceof Error
            ? err.message
            : "Failed to initialize plugin system";
      } finally {
        this.loading = false;
      }
    },

    /** 批量获取所有已启用插件的权限 */
    async fetchAllPluginPermissions() {
      const token = Token.getToken();
      if (!token?.accessToken) return;

      const enabledIds = Array.from(
        this.plugins.values() as Iterable<PluginInfo>
      )
        .filter((p) => p.enabled)
        .map((p) => p.pluginId);

      let permissionApiUnavailable = false;

      for (const pluginId of enabledIds) {
        if (permissionApiUnavailable) break;
        try {
          const res = await request.get("/v1/plugin/allowed-actions", {
            params: { plugin_name: pluginId },
            skipErrorMessage: true,
          });
          if (res.data?.code === 0) {
            this.pluginPermissions[pluginId] = res.data.data?.actions ?? [];
          }
        } catch (err) {
          const status = (err as { response?: { status?: number } })?.response
            ?.status;
          if (status === 404) {
            permissionApiUnavailable = true;
          }
          // API 不可用或网络错误时不隐藏插件
        }
      }
    },

    async activatePlugin(pluginId: string, container: HTMLElement) {
      this.loading = true;
      this.error = null;
      try {
        await pluginSystem.loadPlugin(pluginId, container);
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
