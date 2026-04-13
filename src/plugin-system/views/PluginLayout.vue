<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { useTheme } from "@/composables/useTheme";
import { pluginSystem } from "@/plugin-system";
import { Loading } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const store = usePluginSystemStore();
const appStore = useAppStoreHook();
const { currentThemeName } = useTheme();

/** iframe 挂载容器 */
const containerRef = ref<HTMLDivElement>();

const pluginId = computed(() => route.params.pluginId as string | undefined);

const _pluginInfo = computed(() => {
  if (!pluginId.value) return undefined;
  return store.plugins.get(pluginId.value);
});

const loading = ref(false);
const error = ref<string | null>(null);
const accessState = ref<"idle" | "forbidden" | "degraded">("idle");
const mountedPluginId = ref<string | null>(null);

/**
 * 当 pluginId 变化时：卸载旧插件 → 初始化系统 → 激活新插件。
 * iframe 创建、PLUGIN_READY/INIT 握手、Token 注入全部由 PluginSystem core 层处理。
 */
watch(
  pluginId,
  async (newId, oldId) => {
    accessState.value = "idle";
    error.value = null;

    // 卸载旧插件
    if (oldId) {
      await store.deactivatePlugin(oldId);
      if (mountedPluginId.value === oldId) {
        mountedPluginId.value = null;
      }
    }

    if (!newId) return;

    loading.value = true;
    try {
      // 确保插件系统已初始化（幂等）
      await store.init();

      const access = await store.ensurePluginAccess(newId);
      if (access.status === "forbidden") {
        accessState.value = "forbidden";
        loading.value = false;
        return;
      }
      if (access.status === "degraded") {
        accessState.value = "degraded";
        error.value = "插件暂时不可用，请稍后重试";
        loading.value = false;
        return;
      }

      // 等待 DOM 容器就绪
      await nextTickContainer();

      if (!containerRef.value) {
        throw new Error("Plugin container element not available");
      }

      // 委托给 core 层：创建 iframe + 注册 MessageBus + 状态机
      await store.activatePlugin(newId, containerRef.value, {
        lang: appStore.language,
        theme: currentThemeName.value,
      });
      mountedPluginId.value = newId;

      // 检查激活后的状态
      const info = store.plugins.get(newId);
      if (info?.state === "error") {
        error.value = info.lastError || "插件加载失败";
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "加载插件失败";
    } finally {
      loading.value = false;
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

function getActivePluginIframe(): HTMLIFrameElement | null {
  return containerRef.value?.querySelector("iframe") ?? null;
}

function toQueryRecord(value: unknown): LocationQueryRaw {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const query: LocationQueryRaw = {};

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (Array.isArray(item)) {
      query[key] = item.map((entry) => String(entry));
      return;
    }
    if (item == null) {
      query[key] = item;
      return;
    }
    query[key] = String(item);
  });

  return query;
}

function handlePluginMessage(event: MessageEvent) {
  const iframe = getActivePluginIframe();
  if (!iframe || event.source !== iframe.contentWindow) {
    return;
  }

  const iframeOrigin = (() => {
    try {
      return new URL(iframe.src).origin;
    } catch {
      return "";
    }
  })();
  if (iframeOrigin && event.origin !== iframeOrigin) {
    return;
  }

  const message = event.data as {
    type?: string;
    payload?: Record<string, unknown>;
  };
  if (message?.type !== "EVENT") {
    return;
  }

  const payload = message.payload ?? {};
  if (payload.event !== "navigate-host") {
    return;
  }

  const path = typeof payload.path === "string" ? payload.path : "";
  if (!path) {
    return;
  }

  router.push({
    path,
    query: toQueryRecord(payload.query),
  });
}

function handleRetry() {
  if (!pluginId.value) return;
  // 强制重新激活：先卸载再加载
  const id = pluginId.value;
  store.deactivatePlugin(id).then(async () => {
    if (mountedPluginId.value === id) {
      mountedPluginId.value = null;
    }
    loading.value = true;
    error.value = null;
    try {
      await nextTickContainer();
      if (containerRef.value) {
        await store.activatePlugin(id, containerRef.value, {
          lang: appStore.language,
          theme: currentThemeName.value,
        });
        mountedPluginId.value = id;
        const info = store.plugins.get(id);
        if (info?.state === "error") {
          error.value = info.lastError || "插件加载失败";
        }
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "重试失败";
    } finally {
      loading.value = false;
    }
  });
}

onMounted(() => {
  window.addEventListener("message", handlePluginMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handlePluginMessage);
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
