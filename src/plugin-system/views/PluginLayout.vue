<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { useTheme } from "@/composables/useTheme";
import { pluginSystem } from "@/plugin-system";
import { normalizePluginUrlQuery } from "@/plugin-system/utils/pluginUrl";
import { resolvePluginHostAction } from "@/plugin-system/views/pluginHostActions";
import type { PluginMessage } from "@/plugin-system/types";
import { Loading } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const store = usePluginSystemStore();
const appStore = useAppStoreHook();
const { currentThemeName } = useTheme();

/** iframe 挂载容器 */
const containerRef = ref<HTMLDivElement>();

const pluginId = computed(() => route.params.pluginId as string | undefined);

const loading = ref(false);
const error = ref<string | null>(null);
const accessState = ref<"idle" | "forbidden" | "degraded" | "unavailable">(
  "idle"
);
const mountedPluginId = ref<string | null>(null);
const activeFlowId = ref(0);
let unsubscribePluginEvents: (() => void) | null = null;
const pluginUrlsSyncedFromIframe = new Set<string>();
let pendingPluginUrlReactivationFor: string | null = null;
let activePluginUrlReactivationFor: string | null = null;
let pluginUrlReactivationRunning = false;

function getErrorStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

function beginFlow() {
  activeFlowId.value += 1;
  return activeFlowId.value;
}

function isFlowCurrent(flowId: number, expectedId?: string) {
  return activeFlowId.value === flowId && pluginId.value === expectedId;
}

async function activatePluginForRoute(
  targetPluginId: string,
  flowId: number,
  options: { forceAccess?: boolean } = {}
) {
  // 确保插件系统已初始化（幂等）
  await store.init();
  if (!isFlowCurrent(flowId, targetPluginId)) return;

  // A stale or mistyped plugin route must not render an empty host shell.
  // The runtime registry is authoritative after init; use one neutral state so
  // callers cannot distinguish an unknown plugin from an unavailable one.
  if (!store.plugins.has(targetPluginId)) {
    accessState.value = "unavailable";
    return;
  }

  const access = await store.ensurePluginAccess(
    targetPluginId,
    options.forceAccess ? { force: true } : {}
  );
  if (!isFlowCurrent(flowId, targetPluginId)) return;

  if (access.status === "forbidden") {
    accessState.value = "forbidden";
    return;
  }
  if (access.status === "degraded") {
    accessState.value = "degraded";
    error.value = "插件暂时不可用，请稍后重试";
    return;
  }

  // 等待 DOM 容器就绪
  await nextTickContainer();
  if (!isFlowCurrent(flowId, targetPluginId)) return;

  if (!containerRef.value) {
    throw new Error("Plugin container element not available");
  }

  // 委托给 core 层：创建 iframe + 注册 MessageBus + 状态机
  await store.activatePlugin(targetPluginId, containerRef.value, {
    lang: appStore.language,
    theme: currentThemeName.value,
    pluginUrl: normalizePluginUrlQuery(route.query.pluginUrl) ?? undefined,
  });
  if (!isFlowCurrent(flowId, targetPluginId)) {
    await store.deactivatePlugin(targetPluginId);
    return;
  }

  mountedPluginId.value = targetPluginId;

  // 检查激活后的状态
  const info = store.plugins.get(targetPluginId);
  if (info?.state === "error") {
    error.value = info.lastError || "插件加载失败";
  }
}

async function reactivatePluginForRoute(
  targetPluginId: string,
  options: {
    forceAccess?: boolean;
    fallbackError: string;
  }
) {
  const flowId = beginFlow();
  loading.value = true;
  accessState.value = "idle";
  error.value = null;

  await store.deactivatePlugin(targetPluginId);
  if (!isFlowCurrent(flowId, targetPluginId)) {
    return;
  }
  if (mountedPluginId.value === targetPluginId) {
    mountedPluginId.value = null;
  }

  try {
    await activatePluginForRoute(targetPluginId, flowId, {
      forceAccess: options.forceAccess,
    });
  } catch (e: unknown) {
    if (!isFlowCurrent(flowId, targetPluginId)) {
      return;
    }
    if (getErrorStatus(e) === 401) {
      return;
    }
    error.value = e instanceof Error ? e.message : options.fallbackError;
  } finally {
    if (isFlowCurrent(flowId, targetPluginId)) {
      loading.value = false;
    }
  }
}

async function drainPluginUrlReactivations() {
  if (pluginUrlReactivationRunning) {
    return;
  }

  pluginUrlReactivationRunning = true;
  try {
    while (pendingPluginUrlReactivationFor) {
      const targetPluginId = pendingPluginUrlReactivationFor;
      pendingPluginUrlReactivationFor = null;
      if (pluginId.value !== targetPluginId) {
        continue;
      }

      activePluginUrlReactivationFor = targetPluginId;
      try {
        await reactivatePluginForRoute(targetPluginId, {
          fallbackError: "加载插件失败",
        });
      } finally {
        activePluginUrlReactivationFor = null;
      }
    }
  } finally {
    pluginUrlReactivationRunning = false;
  }
}

function schedulePluginUrlReactivation(targetPluginId: string) {
  pendingPluginUrlReactivationFor = targetPluginId;
  // Supersede an in-flight activation immediately; the drain serializes teardown.
  beginFlow();
  void drainPluginUrlReactivations();
}

/**
 * 当 pluginId 变化时：卸载旧插件 → 初始化系统 → 激活新插件。
 * iframe 创建、PLUGIN_READY/INIT 握手、Token 注入全部由 PluginSystem core 层处理。
 */
watch(
  pluginId,
  async (newId, oldId) => {
    const flowId = beginFlow();
    accessState.value = "idle";
    error.value = null;

    // 卸载旧插件
    if (oldId) {
      await store.deactivatePlugin(oldId);
      if (mountedPluginId.value === oldId) {
        mountedPluginId.value = null;
      }
    }

    if (!isFlowCurrent(flowId, newId)) return;
    if (!newId) {
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      await activatePluginForRoute(newId, flowId);
    } catch (e: unknown) {
      if (!isFlowCurrent(flowId, newId)) return;
      if (getErrorStatus(e) === 401) return;
      error.value = e instanceof Error ? e.message : "加载插件失败";
    } finally {
      if (isFlowCurrent(flowId, newId)) {
        loading.value = false;
      }
    }
  },
  { immediate: true }
);

/** 主题变更时广播 THEME_CHANGE 到所有活跃插件 */
watch(currentThemeName, (newTheme) => {
  const DARK_THEMES = ["deep-space", "cyber-tech"];
  pluginSystem.broadcastThemeChange(newTheme, DARK_THEMES.includes(newTheme));
});

/** 语言变更时广播 LANG_CHANGE 到所有活跃插件 */
watch(
  () => appStore.language,
  (newLang) => {
    pluginSystem.broadcastLangChange(newLang);
  }
);

watch(
  () => normalizePluginUrlQuery(route.query.pluginUrl),
  (newPluginUrl, oldPluginUrl) => {
    if (newPluginUrl === oldPluginUrl) {
      return;
    }

    if (newPluginUrl && pluginUrlsSyncedFromIframe.delete(newPluginUrl)) {
      return;
    }

    const targetPluginId = pluginId.value;
    if (
      !targetPluginId ||
      (mountedPluginId.value !== targetPluginId &&
        activePluginUrlReactivationFor !== targetPluginId &&
        pendingPluginUrlReactivationFor !== targetPluginId)
    ) {
      return;
    }

    schedulePluginUrlReactivation(targetPluginId);
  }
);

/** 等待下一 tick 确保 containerRef 已挂载 */
function nextTickContainer(): Promise<void> {
  return new Promise((resolve) => {
    if (containerRef.value) {
      resolve();
    } else {
      requestAnimationFrame(() => resolve());
    }
  });
}

function handlePluginEvent(sourcePluginId: string, message: PluginMessage) {
  const currentRoutePluginId = pluginId.value;
  const mountedId = mountedPluginId.value;
  if (!currentRoutePluginId || !mountedId) {
    return;
  }
  if (sourcePluginId !== currentRoutePluginId || sourcePluginId !== mountedId) {
    return;
  }

  if (message?.type !== "EVENT") {
    return;
  }

  const payload = message.payload ?? {};
  const action = resolvePluginHostAction(payload);
  if (!action) {
    return;
  }

  if (action.type === "reload-host") {
    window.location.reload();
    return;
  }

  if (action.type === "sync-plugin-url") {
    if (route.query.pluginUrl === action.pluginUrl) {
      return;
    }

    pluginUrlsSyncedFromIframe.add(action.pluginUrl);
    void Promise.resolve(
      router.replace({
        path: route.path,
        query: {
          ...route.query,
          pluginUrl: action.pluginUrl,
        },
      })
    ).then(
      async () => {
        await nextTick();
        pluginUrlsSyncedFromIframe.delete(action.pluginUrl);
      },
      () => {
        pluginUrlsSyncedFromIframe.delete(action.pluginUrl);
      }
    );
    return;
  }

  router.push({
    path: action.path,
    query: action.query,
  });
}

async function handleRetry() {
  if (!pluginId.value) return;
  await reactivatePluginForRoute(pluginId.value, {
    forceAccess: true,
    fallbackError: "重试失败",
  });
}

onMounted(() => {
  unsubscribePluginEvents = pluginSystem.onPluginEvent(handlePluginEvent);
});

onBeforeUnmount(() => {
  activeFlowId.value += 1;
  pendingPluginUrlReactivationFor = null;
  unsubscribePluginEvents?.();
  unsubscribePluginEvents = null;
  pluginUrlsSyncedFromIframe.clear();
  const idToDeactivate = mountedPluginId.value ?? pluginId.value;
  if (idToDeactivate) {
    store.deactivatePlugin(idToDeactivate);
    mountedPluginId.value = null;
  }
});
</script>

<template>
  <div class="plugin-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="plugin-page__loading">
      <el-icon class="is-loading" :size="32">
        <Loading></Loading>
      </el-icon>
      <p>插件加载中...</p>
    </div>

    <div v-else-if="accessState === 'forbidden'" class="plugin-page__error">
      <el-result
        icon="warning"
        title="无权限访问插件"
        sub-title="当前账号没有该插件的访问权限"
      ></el-result>
    </div>

    <div v-else-if="accessState === 'unavailable'" class="plugin-page__error">
      <el-result
        icon="info"
        title="插件不可用"
        sub-title="该插件不存在或当前环境未注册"
      ></el-result>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="plugin-page__error">
      <el-result icon="error" title="插件加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="handleRetry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!pluginId" class="plugin-page__empty">
      <el-empty description="请从左侧菜单选择一个工具"></el-empty>
    </div>

    <!-- iframe 容器：由 PluginLoader 动态创建 iframe 并 append 到此 div -->
    <div ref="containerRef" class="plugin-page__iframe"></div>
  </div>
</template>

<style scoped>
.plugin-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.plugin-page__iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.plugin-page__loading,
.plugin-page__error,
.plugin-page__empty {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color);
}

.plugin-page__loading {
  pointer-events: none;
}
</style>

<style lang="scss">
/* 隐藏插件页面的 footer */
.main-container:has(.plugin-page) > footer {
  display: none !important;
}
</style>
