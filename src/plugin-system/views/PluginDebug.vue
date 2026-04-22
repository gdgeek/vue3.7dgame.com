<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from "vue";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { resolveI18nName } from "@/plugin-system/utils/i18n";
import {
  Refresh,
  Warning,
  SuccessFilled,
  CircleCloseFilled,
  Loading as LoadingIcon,
  InfoFilled,
  Document,
  Connection,
  Lock,
  Setting,
} from "@element-plus/icons-vue";

import type { PluginAccessScope, PluginManifest } from "@/plugin-system/types";
import type { TabPaneName } from "element-plus";

const store = usePluginSystemStore();
const appStore = useAppStoreHook();

const refreshing = ref(false);
const initError = ref<string | null>(null);
const activeTab: Ref<TabPaneName> = ref("overview");

const config = computed(() => store.config);
const plugins = computed(() => Array.from(store.plugins.values()));
const menuGroups = computed(() => store.menuGroups);
const enabledPlugins = computed(() => store.enabledPlugins);
const configuredAccessScopes = computed(() => store.pluginAccessScopes);
const currentTokenAccessScopes = computed(
  () => store.currentTokenPluginAccessScopes
);
const accessStates = computed(() => store.currentTokenPluginAccessStates);
const hostSession = computed(() => ({
  resolved: store.hostSessionResolved ?? false,
  authenticated: store.hostSessionAuthenticated ?? false,
  roles: store.hostSessionRoles ?? [],
}));
const accessDebugPayload = computed(() => ({
  configuredAccessScopes: configuredAccessScopes.value,
  currentTokenAccessScopes: currentTokenAccessScopes.value,
  accessStates: accessStates.value,
  hostSession: hostSession.value,
}));

const stateStats = computed(() => {
  const stats = { unloaded: 0, loading: 0, active: 0, error: 0, total: 0 };
  for (const p of plugins.value) {
    stats[p.state]++;
    stats.total++;
  }
  return stats;
});

const configManifests = computed<PluginManifest[]>(
  () => config.value?.plugins ?? []
);

async function handleInit() {
  initError.value = null;
  try {
    await store.init();
  } catch (e: unknown) {
    initError.value = e instanceof Error ? e.message : String(e);
  }
}

async function handleRefresh() {
  refreshing.value = true;
  initError.value = null;
  try {
    await store.refreshConfig();
  } catch (e: unknown) {
    initError.value = e instanceof Error ? e.message : String(e);
  } finally {
    refreshing.value = false;
  }
}

function stateTagType(
  state: string
): "success" | "warning" | "danger" | "info" {
  switch (state) {
    case "active":
      return "success";
    case "loading":
      return "warning";
    case "error":
      return "danger";
    default:
      return "info";
  }
}

function pluginAccessState(pluginId: string) {
  return accessStates.value[pluginId] ?? "unknown";
}

function accessScopeLabel(accessScope: PluginAccessScope | null | undefined) {
  return accessScope ?? "auth-only";
}

function accessStateLabel(pluginId: string): string {
  const state = pluginAccessState(pluginId);
  const accessScope = currentTokenAccessScopes.value[pluginId];

  if (state === "unknown") return "未获取";
  if (state === "loading") return "加载中";
  if (state === "forbidden") return "无权限";
  if (state === "degraded") return "服务降级";
  return `可见: ${accessScopeLabel(accessScope)}`;
}

function accessStateTagType(
  pluginId: string
): "success" | "warning" | "danger" | "info" {
  switch (pluginAccessState(pluginId)) {
    case "loading":
      return "warning";
    case "forbidden":
      return "danger";
    case "degraded":
      return "warning";
    case "visible":
      return "success";
    default:
      return "info";
  }
}

function accessStateHint(pluginId: string): string {
  const state = pluginAccessState(pluginId);
  const configuredScope = accessScopeLabel(
    configuredAccessScopes.value[pluginId] ?? null
  );
  const currentScope = accessScopeLabel(
    currentTokenAccessScopes.value[pluginId] ?? null
  );

  switch (state) {
    case "unknown":
      return "尚未完成当前 token 的 verify-token 校验";
    case "loading":
      return "正在根据当前登录态校验菜单可见性";
    case "forbidden":
      return `当前角色不满足 ${configuredScope}`;
    case "degraded":
      return "verify-token 调用异常，宿主暂时隐藏该插件";
    case "visible":
      return `当前角色满足 ${currentScope}`;
    default:
      return configuredScope;
  }
}

onMounted(() => {
  handleInit();
});
</script>

<template>
  <div class="plugin-debug">
    <div class="plugin-debug__header">
      <div class="plugin-debug__title">
        <el-icon :size="24">
          <Setting></Setting>
        </el-icon>
        <h2>插件系统调试面板</h2>
      </div>
      <div class="plugin-debug__actions">
        <el-tag :type="store.initialized ? 'success' : 'warning'" size="large">
          {{ store.initialized ? "已初始化" : "未初始化" }}
        </el-tag>
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="refreshing"
          @click="handleRefresh"
        >
          刷新配置
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="initError || store.error"
      :title="initError || store.error || ''"
      type="error"
      show-icon
      closable
      class="plugin-debug__alert"
    ></el-alert>

    <el-row :gutter="16" class="plugin-debug__stats">
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="总插件数" :value="stateStats.total">
            <template #prefix
              ><el-icon> <Document></Document> </el-icon
            ></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="可见插件" :value="enabledPlugins.length">
            <template #prefix>
              <el-icon color="#67c23a">
                <SuccessFilled></SuccessFilled>
              </el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="Active" :value="stateStats.active">
            <template #prefix
              ><el-icon color="#67c23a"> <Connection></Connection> </el-icon
            ></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="Loading" :value="stateStats.loading">
            <template #prefix>
              <el-icon color="#e6a23c">
                <LoadingIcon></LoadingIcon>
              </el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="Error" :value="stateStats.error">
            <template #prefix>
              <el-icon color="#f56c6c">
                <CircleCloseFilled></CircleCloseFilled>
              </el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="Unloaded" :value="stateStats.unloaded">
            <template #prefix>
              <el-icon color="#909399">
                <InfoFilled></InfoFilled>
              </el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="plugin-debug__tabs">
      <el-tab-pane label="总览" name="overview">
        <el-descriptions title="配置信息" :column="3" border>
          <el-descriptions-item label="配置版本">
            {{ config?.version ?? "N/A" }}
          </el-descriptions-item>
          <el-descriptions-item label="菜单分组数">
            {{ menuGroups.length }}
          </el-descriptions-item>
          <el-descriptions-item label="插件总数">
            {{ configManifests.length }}
          </el-descriptions-item>
          <el-descriptions-item label="Store 初始化">
            <el-tag
              :type="store.initialized ? 'success' : 'danger'"
              size="small"
            >
              {{ store.initialized }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前活跃插件">
            {{ store.activePluginId ?? "无" }}
          </el-descriptions-item>
          <el-descriptions-item label="当前语言">
            {{ appStore.language }}
          </el-descriptions-item>
          <el-descriptions-item label="宿主会话已解析">
            <el-tag
              :type="hostSession.resolved ? 'success' : 'info'"
              size="small"
            >
              {{ hostSession.resolved }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="宿主已登录">
            <el-tag
              :type="hostSession.authenticated ? 'success' : 'warning'"
              size="small"
            >
              {{ hostSession.authenticated }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="宿主角色">
            {{
              hostSession.roles.length ? hostSession.roles.join(", ") : "未获取"
            }}
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="运行时插件" name="runtime">
        <el-table :data="plugins" stripe border style="width: 100%">
          <el-table-column
            prop="pluginId"
            label="Plugin ID"
            width="180"
          ></el-table-column>
          <el-table-column label="名称" width="160">
            <template #default="{ row }">
              {{ resolveI18nName(row.name, row.nameI18n, appStore.language) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="stateTagType(row.state)" size="small">
                {{ row.state }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="80" align="center">
            <template #default="{ row }">
              <el-icon v-if="row.enabled" color="#67c23a">
                <SuccessFilled></SuccessFilled>
              </el-icon>
              <el-icon v-else color="#f56c6c">
                <CircleCloseFilled></CircleCloseFilled>
              </el-icon>
            </template>
          </el-table-column>
          <el-table-column label="access_scope" width="140" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">
                {{ accessScopeLabel(row.accessScope) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="菜单访问" min-width="180">
            <template #default="{ row }">
              <el-tag :type="accessStateTagType(row.pluginId)" size="small">
                {{ accessStateLabel(row.pluginId) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="group"
            label="分组"
            width="120"
          ></el-table-column>
          <el-table-column
            prop="order"
            label="排序"
            width="80"
            align="center"
          ></el-table-column>
          <el-table-column
            prop="description"
            label="描述"
            min-width="200"
            show-overflow-tooltip
          ></el-table-column>
          <el-table-column
            label="错误信息"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span v-if="row.lastError" style="color: #f56c6c">{{
                row.lastError
              }}</span>
              <span v-else style="color: #909399">—</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="清单配置" name="manifest">
        <el-table :data="configManifests" stripe border style="width: 100%">
          <el-table-column prop="id" label="ID" width="180"></el-table-column>
          <el-table-column label="名称" width="160">
            <template #default="{ row }">
              {{ resolveI18nName(row.name, row.nameI18n, appStore.language) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="version"
            label="版本"
            width="100"
          ></el-table-column>
          <el-table-column label="access_scope" width="140" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">
                {{ accessScopeLabel(row.accessScope) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="URL" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link
                type="primary"
                :href="row.url"
                target="_blank"
                :underline="false"
              >
                {{ row.url }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="80" align="center">
            <template #default="{ row }">
              <el-icon v-if="row.enabled" color="#67c23a">
                <SuccessFilled></SuccessFilled>
              </el-icon>
              <el-icon v-else color="#f56c6c">
                <CircleCloseFilled></CircleCloseFilled>
              </el-icon>
            </template>
          </el-table-column>
          <el-table-column
            prop="allowedOrigin"
            label="Allowed Origin"
            min-width="200"
            show-overflow-tooltip
          ></el-table-column>
          <el-table-column
            prop="sandbox"
            label="Sandbox"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.sandbox ?? "allow-scripts allow-same-origin (默认)" }}
            </template>
          </el-table-column>
          <el-table-column
            prop="group"
            label="分组"
            width="100"
          ></el-table-column>
          <el-table-column
            prop="order"
            label="排序"
            width="80"
            align="center"
          ></el-table-column>
          <el-table-column label="extraConfig" min-width="200">
            <template #default="{ row }">
              <el-popover
                v-if="row.extraConfig && Object.keys(row.extraConfig).length"
                trigger="hover"
                width="400"
              >
                <template #reference>
                  <el-button link type="primary" size="small">查看</el-button>
                </template>
                <pre style="margin: 0; font-size: 12px">{{
                  JSON.stringify(row.extraConfig, null, 2)
                }}</pre>
              </el-popover>
              <span v-else style="color: #909399">—</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="菜单分组" name="groups">
        <el-table :data="menuGroups" stripe border style="width: 100%">
          <el-table-column
            prop="id"
            label="分组 ID"
            width="180"
          ></el-table-column>
          <el-table-column label="名称" width="200">
            <template #default="{ row }">
              {{ resolveI18nName(row.name, row.nameI18n, appStore.language) }}
            </template>
          </el-table-column>
          <el-table-column prop="icon" label="图标" width="120">
            <template #default="{ row }">
              <el-icon>
                <component :is="row.icon"></component>
              </el-icon>
              <span style="margin-left: 8px">{{ row.icon }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="order"
            label="排序"
            width="100"
            align="center"
          ></el-table-column>
          <el-table-column label="i18n 名称" min-width="300">
            <template #default="{ row }">
              <template v-if="row.nameI18n">
                <el-tag
                  v-for="(val, lang) in row.nameI18n"
                  :key="lang"
                  size="small"
                  class="plugin-debug__i18n-tag"
                >
                  {{ lang }}: {{ val }}
                </el-tag>
              </template>
              <span v-else style="color: #909399">—</span>
            </template>
          </el-table-column>
          <el-table-column label="关联插件" min-width="200">
            <template #default="{ row }">
              <template v-if="store.pluginsByGroup.get(row.id)?.length">
                <el-tag
                  v-for="p in store.pluginsByGroup.get(row.id)"
                  :key="p.pluginId"
                  size="small"
                  type="info"
                  class="plugin-debug__i18n-tag"
                >
                  {{ p.pluginId }}
                </el-tag>
              </template>
              <span v-else style="color: #909399">无可见插件</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="访问详情" name="permissions">
        <el-table :data="plugins" stripe border style="width: 100%">
          <el-table-column
            prop="pluginId"
            label="Plugin ID"
            width="200"
          ></el-table-column>
          <el-table-column label="名称" width="160">
            <template #default="{ row }">
              {{ resolveI18nName(row.name, row.nameI18n, appStore.language) }}
            </template>
          </el-table-column>
          <el-table-column label="配置 access_scope" width="160" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">
                {{ accessScopeLabel(configuredAccessScopes[row.pluginId]) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前 token 结果" width="140" align="center">
            <template #default="{ row }">
              <el-tag :type="accessStateTagType(row.pluginId)" size="small">
                {{ accessStateLabel(row.pluginId) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="当前 token access_scope"
            width="180"
            align="center"
          >
            <template #default="{ row }">
              <span style="color: #606266">
                {{ accessScopeLabel(currentTokenAccessScopes[row.pluginId]) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="菜单可见" width="120" align="center">
            <template #default="{ row }">
              <el-icon
                v-if="pluginAccessState(row.pluginId) === 'visible'"
                color="#67c23a"
              >
                <SuccessFilled></SuccessFilled>
              </el-icon>
              <el-icon v-else color="#f56c6c">
                <CircleCloseFilled></CircleCloseFilled>
              </el-icon>
            </template>
          </el-table-column>
          <el-table-column label="说明" min-width="250">
            <template #default="{ row }">
              <span
                v-if="pluginAccessState(row.pluginId) === 'unknown'"
                style="color: #e6a23c"
              >
                <el-icon>
                  <Warning></Warning>
                </el-icon>
                {{ accessStateHint(row.pluginId) }}
              </span>
              <span
                v-else-if="pluginAccessState(row.pluginId) === 'forbidden'"
                style="color: #f56c6c"
              >
                <el-icon>
                  <Lock></Lock>
                </el-icon>
                {{ accessStateHint(row.pluginId) }}
              </span>
              <span v-else style="color: #67c23a">
                {{ accessStateHint(row.pluginId) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="原始 JSON" name="raw">
        <el-collapse>
          <el-collapse-item title="plugins.json 配置" name="config">
            <pre class="plugin-debug__json">{{
              JSON.stringify(config, null, 2)
            }}</pre>
          </el-collapse-item>
          <el-collapse-item title="运行时插件 Map" name="plugins-map">
            <pre class="plugin-debug__json">{{
              JSON.stringify(plugins, null, 2)
            }}</pre>
          </el-collapse-item>
          <el-collapse-item title="访问状态数据" name="perms">
            <pre class="plugin-debug__json">{{
              JSON.stringify(accessDebugPayload, null, 2)
            }}</pre>
          </el-collapse-item>
          <el-collapse-item title="Store 状态" name="store-state">
            <pre class="plugin-debug__json">{{
              JSON.stringify(
                {
                  initialized: store.initialized,
                  loading: store.loading,
                  error: store.error,
                  activePluginId: store.activePluginId,
                  pluginCount: plugins.length,
                  enabledCount: enabledPlugins.length,
                  menuGroupCount: menuGroups.length,
                },
                null,
                2
              )
            }}</pre>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.plugin-debug {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
  background: var(--el-bg-color-page, #f5f7fa);
}

.plugin-debug__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.plugin-debug__title {
  display: flex;
  gap: 8px;
  align-items: center;
}

.plugin-debug__title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.plugin-debug__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.plugin-debug__alert {
  margin-bottom: 16px;
}

.plugin-debug__stats {
  margin-bottom: 20px;
}

.plugin-debug__tabs {
  padding: 16px;
  background: var(--el-bg-color, #fff);
  border-radius: 4px;
}

.plugin-debug__i18n-tag {
  margin: 2px 4px 2px 0;
}

.plugin-debug__json {
  padding: 12px;
  margin: 0;
  overflow-x: auto;
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter, #f5f7fa);
  border-radius: 4px;
}
</style>
