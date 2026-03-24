<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { useTheme } from "@/composables/useTheme";
import { Loading } from "@element-plus/icons-vue";
import Token from "@/store/modules/token";

const route = useRoute();
const store = usePluginSystemStore();
const appStore = useAppStoreHook();
const { currentThemeName } = useTheme();
const iframeRef = ref<HTMLIFrameElement>();

const pluginId = computed(() => route.params.pluginId as string | undefined);

const pluginInfo = computed(() => {
  if (!pluginId.value) return undefined;
  return store.plugins.get(pluginId.value);
});

// Find the plugin manifest to get the URL and origin
const pluginManifest = computed(() => {
  if (!pluginId.value || !store.config) return undefined;
  return store.config.plugins.find((p) => p.id === pluginId.value);
});

const pluginUrl = computed(() => {
  const baseUrl = pluginManifest.value?.url ?? "";
  if (!baseUrl) return "";
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}lang=${appStore.language}&theme=${currentThemeName.value}`;
});

const loading = ref(false);
const error = ref<string | null>(null);

watch(
  pluginId,
  async (newId) => {
    error.value = null;
    if (!newId) return;
    loading.value = true;
    try {
      await store.init();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "加载插件失败";
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

/** iframe 加载完成 — 仅更新 loading 状态，不发送 INIT */
function handleIframeLoad() {
  loading.value = false;
}

/** 向插件 iframe 发送 INIT 消息（携带 JWT token 和 extraConfig） */
function sendInitToPlugin() {
  const manifest = pluginManifest.value;
  if (!manifest || !iframeRef.value?.contentWindow) return;

  // 优先使用 accessToken（JWT），fallback 到 token 字段
  const tokenInfo = Token.getToken();
  const jwt = tokenInfo?.accessToken || tokenInfo?.token || "";

  const initMessage = {
    type: "INIT" as const,
    id: `init-${manifest.id}-${Date.now()}`,
    payload: {
      token: jwt,
      config: JSON.parse(JSON.stringify(manifest.extraConfig ?? {})),
    },
  };

  iframeRef.value.contentWindow.postMessage(
    initMessage,
    manifest.allowedOrigin
  );
}

/** 监听插件 postMessage，收到 PLUGIN_READY 后发送 INIT */
function handlePluginMessage(event: MessageEvent) {
  if (event.source !== iframeRef.value?.contentWindow) return;
  const { type } = event.data || {};
  if (type === "PLUGIN_READY") {
    sendInitToPlugin();
  }
}

function handleIframeError() {
  loading.value = false;
  error.value = "插件页面加载失败";
}

function handleRetry() {
  if (iframeRef.value && pluginUrl.value) {
    loading.value = true;
    error.value = null;
    iframeRef.value.src = pluginUrl.value;
  }
}

onMounted(() => {
  window.addEventListener("message", handlePluginMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handlePluginMessage);
  if (pluginId.value) {
    store.deactivatePlugin(pluginId.value);
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

    <!-- iframe 载入插件 -->
    <iframe
      v-if="pluginUrl"
      ref="iframeRef"
      :src="pluginUrl"
      class="plugin-page__iframe"
      :title="pluginInfo?.name ?? '插件'"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="clipboard-write; clipboard-read"
      @load="handleIframeLoad"
      @error="handleIframeError"
    ></iframe>
  </div>
</template>

<style scoped>
.plugin-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.plugin-page__iframe {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--bg-card, #fff);
  border: none;
  outline: none;
}

.plugin-page__loading,
.plugin-page__error,
.plugin-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>

<style lang="scss">
/* 隐藏插件页面的 footer */
.main-container:has(.plugin-page) > footer {
  display: none !important;
}
</style>
