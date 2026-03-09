<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from "vue";
import { usePluginSystemStore } from "@/store/modules/plugin-system";

const props = defineProps<{
  pluginId: string | null;
}>();

const store = usePluginSystemStore();
const containerRef = ref<HTMLDivElement>();

const activePlugin = computed(() => store.activePlugin);
const loading = computed(() => store.loading);
const error = computed(() => store.error);

watch(
  () => props.pluginId,
  async (newId, oldId) => {
    if (oldId) {
      await store.deactivatePlugin(oldId);
    }
    if (newId && containerRef.value) {
      await store.activatePlugin(newId, containerRef.value);
    }
  }
);

onBeforeUnmount(async () => {
  if (props.pluginId) {
    await store.deactivatePlugin(props.pluginId);
  }
});

async function handleRetry() {
  if (props.pluginId && containerRef.value) {
    await store.activatePlugin(props.pluginId, containerRef.value);
  }
}
</script>

<template>
  <div class="plugin-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="plugin-container__loading">
      <el-icon class="is-loading" :size="32">
        <Loading />
      </el-icon>
      <p>插件加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error || activePlugin?.state === 'error'" class="plugin-container__error">
      <el-result icon="error" :title="'插件加载失败'" :sub-title="activePlugin?.lastError || error">
        <template #extra>
          <el-button type="primary" @click="handleRetry">重试</el-button>
        </template>
      </el-result>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!pluginId" class="plugin-container__empty">
      <el-empty description="请从左侧菜单选择一个插件" />
    </div>

    <!-- iframe 容器 -->
    <div ref="containerRef" class="plugin-container__iframe" />
  </div>
</template>

<style scoped>
.plugin-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.plugin-container__iframe {
  width: 100%;
  height: 100%;
}

.plugin-container__loading,
.plugin-container__error,
.plugin-container__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
