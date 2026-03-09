<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import PluginMenu from "@/plugin-system/components/PluginMenu.vue";
import PluginContainer from "@/plugin-system/views/PluginContainer.vue";

const route = useRoute();
const store = usePluginSystemStore();

const activePluginId = ref<string | null>(
  (route.params.pluginId as string) || null
);

onMounted(async () => {
  await store.init();
});

function handlePluginSelect(pluginId: string) {
  activePluginId.value = pluginId;
}
</script>

<template>
  <div class="plugin-layout">
    <aside class="plugin-layout__sidebar">
      <PluginMenu @select="handlePluginSelect" />
    </aside>
    <main class="plugin-layout__content">
      <PluginContainer :plugin-id="activePluginId" />
    </main>
  </div>
</template>

<style scoped>
.plugin-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.plugin-layout__sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-light, #e4e7ed);
  overflow-y: auto;
}

.plugin-layout__content {
  flex: 1;
  overflow: hidden;
}
</style>
