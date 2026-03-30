import { defineStore } from "pinia";
import { pluginSystem } from "@/plugin-system";
import type { PluginLoadOptions } from "@/plugin-system/core/PluginLoader";
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
        // 临时兜底：忽略权限结果，直接显示插件入口
        // TODO: 恢复为按 allowed-actions 控制
        // const actions = state.pluginPermissions[plugin.pluginId];
        // if (!actions || actions.length === 0) continue;

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
      // 临时兜底：忽略权限结果，直接显示插件入口
      // TODO: 恢复为按 allowed-actions 控制
      return enabled;
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

      // 默认全部关闭（空数组），只有 API 成功返回才打开
      for (const pluginId of enabledIds) {
        this.pluginPermissions[pluginId] = [];
      }

      let permissionApiUnavailable = false;

      const normalizeActions = (value: unknown): string[] | null => {
        if (Array.isArray(value)) {
          return value.filter((item): item is string => typeof item === "string");
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed ? [trimmed] : [];
        }
        return null;
      };

      const extractActions = (payload: unknown): string[] | null => {
        if (!payload || typeof payload !== "object") return null;
        const data = (payload as { data?: unknown }).data;

        return (
          normalizeActions((payload as { actions?: unknown }).actions) ??
          normalizeActions((payload as { allowedActions?: unknown }).allowedActions) ??
          normalizeActions((payload as { permissions?: unknown }).permissions) ??
          normalizeActions((data as { actions?: unknown })?.actions) ??
          normalizeActions((data as { allowedActions?: unknown })?.allowedActions) ??
          normalizeActions((data as { allowed_actions?: unknown })?.allowed_actions) ??
          normalizeActions((data as { permissions?: unknown })?.permissions) ??
          normalizeActions(data)
        );
      };

      for (const pluginId of enabledIds) {
        if (permissionApiUnavailable) break;
        try {
          const res = await request.get("/v1/plugin/allowed-actions", {
            params: { plugin_name: pluginId },
            skipErrorMessage: true,
          });
          if (res.data?.code === 0) {
            const actions = extractActions(res.data);
            if (actions) {
              this.pluginPermissions[pluginId] = actions;
            }
          }
          // code !== 0 时保持默认空数组（关闭）
        } catch (err) {
          const status = (err as { response?: { status?: number } })?.response
            ?.status;
          if (status === 404) {
            permissionApiUnavailable = true;
          }
          // API 失败时保持默认空数组（关闭）
        }
      }

      // 权限 API 不可用时（如后端尚未实现），默认开放所有插件
      if (permissionApiUnavailable) {
        for (const pluginId of enabledIds) {
          this.pluginPermissions[pluginId] = ["*"];
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
        const existing = this.plugins.get(pluginId);
        if (existing?.state === "loading") {
          return;
        }
        if (existing?.state === "active") {
          // Prevent invalid state transition active -> loading
          await this.deactivatePlugin(pluginId);
        }
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
