<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { useTheme } from "@/composables/useTheme";
import { pluginSystem } from "@/plugin-system";
import ResourceDialog from "@/components/MrPP/ResourceDialog.vue";
import { Loading } from "@element-plus/icons-vue";
import { toHttps } from "@/utils/helper";
import { DeviceEnum } from "@/enums/DeviceEnum";

import type { ResourceInfo } from "@/api/v1/resources/model";
import type { CardInfo } from "@/utils/types";

const route = useRoute();
const store = usePluginSystemStore();
const appStore = useAppStoreHook();
const { currentThemeName } = useTheme();
const HOST_PICK_RESOURCE_ACTION = "PICK_POLYGEN_RESOURCE";
const HOST_PICK_PLUGIN_ID = "3d-model-optimizer";

/** iframe 挂载容器 */
const containerRef = ref<HTMLDivElement>();
const resourceDialogRef = ref<InstanceType<typeof ResourceDialog> | null>(null);

const pluginId = computed(() => route.params.pluginId as string | undefined);

const _pluginInfo = computed(() => {
  if (!pluginId.value) return undefined;
  return store.plugins.get(pluginId.value);
});

const loading = ref(false);
const error = ref<string | null>(null);

let pendingResourcePick: {
  resolve: (value: Record<string, unknown>) => void;
  reject: (reason?: unknown) => void;
  settled: boolean;
} | null = null;
let resolvingResourcePick = false;

async function fetchResourceAsFile(resource: ResourceInfo): Promise<File> {
  const fileUrl = toHttps(resource.file?.url ?? "");
  if (!fileUrl) {
    throw new Error("所选模型缺少文件地址");
  }

  const response = await fetch(fileUrl, { method: "GET", credentials: "omit" });
  if (!response.ok) {
    throw new Error(`下载模型失败：${response.status}`);
  }

  const blob = await response.blob();
  const filename =
    resource.file?.filename || `${resource.name || `model-${resource.id}`}.glb`;
  const fileType =
    resource.file?.type || blob.type || "application/octet-stream";

  return new File([blob], filename, {
    type: fileType,
    lastModified: Date.now(),
  });
}

function settlePendingResourcePick(result: Record<string, unknown>) {
  if (!pendingResourcePick || pendingResourcePick.settled) {
    return;
  }
  pendingResourcePick.settled = true;
  pendingResourcePick.resolve(result);
  pendingResourcePick = null;
  resolvingResourcePick = false;
}

function rejectPendingResourcePick(reason: unknown) {
  if (!pendingResourcePick || pendingResourcePick.settled) {
    return;
  }
  pendingResourcePick.settled = true;
  pendingResourcePick.reject(reason);
  pendingResourcePick = null;
  resolvingResourcePick = false;
}

function openPolygenResourceDialog(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (!resourceDialogRef.value) {
      reject(new Error("模型选择器尚未准备好"));
      return;
    }

    if (pendingResourcePick && !pendingResourcePick.settled) {
      rejectPendingResourcePick(new Error("已有模型选择操作正在进行"));
    }

    pendingResourcePick = {
      resolve,
      reject,
      settled: false,
    };
    resolvingResourcePick = false;

    void resourceDialogRef.value.openIt({ type: "polygen" }, "normal");
  });
}

async function handleHostRequest(
  requestPluginId: string,
  action: string
): Promise<Record<string, unknown> | null> {
  if (
    requestPluginId !== HOST_PICK_PLUGIN_ID ||
    action !== HOST_PICK_RESOURCE_ACTION
  ) {
    return null;
  }

  return await openPolygenResourceDialog();
}

async function handleResourceDialogSelected(data: CardInfo) {
  if (!pendingResourcePick) {
    return;
  }

  resolvingResourcePick = true;

  try {
    const resource = data.context as ResourceInfo;
    const file = await fetchResourceAsFile(resource);
    const fileBuffer = await file.arrayBuffer();
    settlePendingResourcePick({
      cancelled: false,
      resourceId: resource.id,
      resourceName: resource.name ?? resource.file?.filename ?? file.name,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileLastModified: file.lastModified,
      fileBuffer,
      fileUrl: toHttps(resource.file?.url ?? ""),
    });
  } catch (error) {
    rejectPendingResourcePick(error);
  } finally {
    resolvingResourcePick = false;
  }
}

function handleResourceDialogClose() {
  if (resolvingResourcePick) {
    return;
  }

  if (!pendingResourcePick || pendingResourcePick.settled) {
    return;
  }

  settlePendingResourcePick({ cancelled: true });
}

pluginSystem.setHostRequestHandler(handleHostRequest);

/**
 * 当 pluginId 变化时：卸载旧插件 → 初始化系统 → 激活新插件。
 * iframe 创建、PLUGIN_READY/INIT 握手、Token 注入全部由 PluginSystem core 层处理。
 */
watch(
  pluginId,
  async (newId, oldId) => {
    error.value = null;

    // 卸载旧插件
    if (oldId) {
      await store.deactivatePlugin(oldId);
    }

    if (!newId) return;

    loading.value = true;
    try {
      if (
        newId === HOST_PICK_PLUGIN_ID &&
        appStore.device !== DeviceEnum.MOBILE
      ) {
        appStore.openSideBar();
      }

      // 确保插件系统已初始化（幂等）
      await store.init();

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
    const waitForStableContainer = async () => {
      await nextTick();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const container = containerRef.value;
        if (
          container &&
          container.isConnected &&
          container.clientWidth > 0 &&
          container.clientHeight > 0
        ) {
          resolve();
          return;
        }

        await new Promise<void>((frameResolve) => {
          requestAnimationFrame(() => frameResolve());
        });
      }

      resolve();
    };

    waitForStableContainer();
  });
}

function handleRetry() {
  if (!pluginId.value) return;
  // 强制重新激活：先卸载再加载
  const id = pluginId.value;
  store.deactivatePlugin(id).then(async () => {
    loading.value = true;
    error.value = null;
    try {
      await nextTickContainer();
      if (containerRef.value) {
        await store.activatePlugin(id, containerRef.value, {
          lang: appStore.language,
          theme: currentThemeName.value,
        });
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

onBeforeUnmount(() => {
  pluginSystem.setHostRequestHandler(null);
  settlePendingResourcePick({ cancelled: true });
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

    <!-- iframe 容器：由 PluginLoader 动态创建 iframe 并 append 到此 div -->
    <div ref="containerRef" class="plugin-page__iframe"></div>
    <ResourceDialog
      ref="resourceDialogRef"
      :multiple="false"
      @selected="handleResourceDialogSelected"
      @close="handleResourceDialogClose"
    ></ResourceDialog>
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
