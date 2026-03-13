<script setup lang="ts">
import { computed } from "vue";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { resolveI18nName } from "@/plugin-system/utils/i18n";

import type { PluginInfo } from "@/plugin-system/types";

const emit = defineEmits<{
  select: [pluginId: string];
}>();

const store = usePluginSystemStore();
const appStore = useAppStoreHook();

const menuGroups = computed(() => store.menuGroups);
const activePluginId = computed(() => store.activePluginId ?? "");

function getGroupPlugins(groupId: string): PluginInfo[] {
  return store.pluginsByGroup.get(groupId) ?? [];
}

function handleSelect(pluginId: string) {
  emit("select", pluginId);
}
</script>

<template>
  <el-menu :default-active="activePluginId" class="plugin-menu">
    <el-sub-menu v-for="group in menuGroups" :key="group.id" :index="group.id">
      <template #title>
        <el-icon>
          <component :is="group.icon"></component>
        </el-icon>
        <span>{{
          resolveI18nName(group.name, group.nameI18n, appStore.language)
        }}</span>
      </template>
      <el-menu-item
        v-for="plugin in getGroupPlugins(group.id)"
        :key="plugin.pluginId"
        :index="plugin.pluginId"
        :disabled="!plugin.enabled"
        @click="handleSelect(plugin.pluginId)"
      >
        <el-icon>
          <component :is="plugin.icon"></component>
        </el-icon>
        <span>{{
          resolveI18nName(plugin.name, plugin.nameI18n, appStore.language)
        }}</span>
        <el-tag
          v-if="plugin.state === 'error'"
          type="danger"
          size="small"
          class="plugin-menu__tag"
        >
          错误
        </el-tag>
        <el-tag
          v-else-if="plugin.state === 'loading'"
          type="warning"
          size="small"
          class="plugin-menu__tag"
        >
          加载中
        </el-tag>
      </el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<style scoped>
.plugin-menu {
  border-right: none;
}

.plugin-menu__tag {
  margin-left: 8px;
}
</style>
