<template>
  <div class="logo-container">
    <transition enter-active-class="animate__animated animate__fadeInLeft">
      <router-link v-if="collapse" class="wh-full flex-center" to="/">
        <img v-if="settingsStore.sidebarLogo" :src="logo" class="logo-image" />
      </router-link>

      <router-link v-else class="wh-full flex-center" to="/">
        <img v-if="settingsStore.sidebarLogo" :src="logo" class="logo-image" />
        <!-- <span class="logo-title"> {{ defaultSettings.title }}</span> -->
        <el-tooltip
          :content="domainStore.title"
          placement="bottom"
          :show-after="300"
        >
          <span class="logo-title">{{ domainStore.title }}</span>
        </el-tooltip>
      </router-link>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import defaultSettings from "@/settings";
import { useSettingsStore } from "@/store";
import { useDomainStore } from "@/store/modules/domain";

const settingsStore = useSettingsStore();
const domainStore = useDomainStore();

defineProps({
  collapse: {
    type: Boolean,
    required: true,
  },
});

const logo = ref(
  new URL("../../../../../public/media/image/logo.gif", import.meta.url).href
);
</script>

<style lang="scss" scoped>
.logo-container {
  width: 100%;
  height: $navbar-height;
  background-color: $sidebar-logo-background;

  .logo-image {
    width: 20px;
    height: 20px;
  }

  .logo-title {
    margin-left: 10px;
    font-size: 14px;
    font-weight: 400;
    color: white;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.layout-top,
.layout-mix {
  .logo-container {
    width: $sidebar-width;
  }

  &.hideSidebar {
    .logo-container {
      width: $sidebar-width-collapsed;
    }
  }
}
</style>
