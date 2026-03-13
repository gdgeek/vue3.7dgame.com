<template>
  <aside class="ar-sidebar" :class="{ collapsed: collapsed }">
    <!-- Logo Section -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <img alt="Logo" :src="logoIcon" />
      </div>
      <span class="logo-text">{{
        domainStore.title || "XR UGC平台（XRUGC.com）"
      }}</span>
    </div>

    <!-- Navigation Section -->
    <nav class="sidebar-nav">
      <el-scrollbar>
        <!-- 主页 -->
        <router-link to="/home" custom v-slot="{ isActive, navigate }">
          <div
            class="sidebar-item"
            :class="{ 'sidebar-item-active': isActive }"
            @click="navigate"
          >
            <font-awesome-icon
              :icon="['fas', 'home']"
              class="sidebar-icon"
            ></font-awesome-icon>
            <span class="item-text">{{ t("sidebar.home") }}</span>
          </div>
        </router-link>

        <!-- 素材库 (可展开) -->
        <div class="nav-group">
          <el-popover
            placement="right"
            :width="200"
            trigger="hover"
            :disabled="!collapsed"
            popper-class="sidebar-submenu-popover"
          >
            <template #reference>
              <div class="menu-trigger-wrapper">
                <div
                  class="sidebar-item"
                  :class="{ 'sidebar-item-has-children': !collapsed }"
                  @click="toggleMenu('resource')"
                >
                  <font-awesome-icon
                    :icon="['fas', 'th-large']"
                    class="sidebar-icon"
                  ></font-awesome-icon>
                  <span class="item-text">{{ t("sidebar.resources") }}</span>
                  <font-awesome-icon
                    v-if="!collapsed"
                    :icon="['fas', 'chevron-right']"
                    class="menu-arrow"
                    :class="{ 'menu-arrow-open': menuOpen.resource }"
                  ></font-awesome-icon>
                </div>
              </div>
            </template>
            <!-- Popover Content -->
            <div class="popover-menu">
              <router-link
                to="/resource/polygen/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.model") }}</span>
                </div>
              </router-link>
              <router-link
                to="/resource/picture/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.picture") }}</span>
                </div>
              </router-link>
              <router-link
                to="/resource/audio/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.audio") }}</span>
                </div>
              </router-link>
              <router-link
                to="/resource/video/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.video") }}</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <!-- Inline Submenu - Click to expand/collapse -->
          <Transition name="submenu-slide">
            <div v-show="!collapsed && menuOpen.resource" class="submenu">
              <router-link
                to="/resource/polygen/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.model") }}</span>
                </div>
              </router-link>
              <router-link
                to="/resource/picture/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.picture") }}</span>
                </div>
              </router-link>
              <router-link
                to="/resource/audio/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.audio") }}</span>
                </div>
              </router-link>
              <router-link
                to="/resource/video/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.video") }}</span>
                </div>
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- 实体 -->
        <router-link to="/meta/list" custom v-slot="{ isActive, navigate }">
          <div
            class="sidebar-item"
            :class="{ 'sidebar-item-active': isActive }"
            @click="navigate"
          >
            <font-awesome-icon
              :icon="['fas', 'puzzle-piece']"
              class="sidebar-icon"
            ></font-awesome-icon>
            <span class="item-text">{{ t("sidebar.entity") }}</span>
          </div>
        </router-link>

        <!-- 场景 (可展开) -->
        <div class="nav-group">
          <el-popover
            placement="right"
            :width="200"
            trigger="hover"
            :disabled="!collapsed"
            popper-class="sidebar-submenu-popover"
          >
            <template #reference>
              <div class="menu-trigger-wrapper">
                <div
                  class="sidebar-item"
                  :class="{ 'sidebar-item-has-children': !collapsed }"
                  @click="toggleMenu('scene')"
                >
                  <font-awesome-icon
                    :icon="['fas', 'layer-group']"
                    class="sidebar-icon"
                  ></font-awesome-icon>
                  <span class="item-text">{{ t("sidebar.scene") }}</span>
                  <font-awesome-icon
                    v-if="!collapsed"
                    :icon="['fas', 'chevron-right']"
                    class="menu-arrow"
                    :class="{ 'menu-arrow-open': menuOpen.scene }"
                  ></font-awesome-icon>
                </div>
              </div>
            </template>
            <!-- Popover Content -->
            <div class="popover-menu">
              <router-link
                to="/verse/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.selfCreated") }}</span>
                </div>
              </router-link>
              <router-link
                to="/verse/public"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.systemRecommend") }}</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <!-- Inline Submenu - Click to expand/collapse -->
          <Transition name="submenu-slide">
            <div v-show="!collapsed && menuOpen.scene" class="submenu">
              <router-link
                to="/verse/index"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.selfCreated") }}</span>
                </div>
              </router-link>
              <router-link
                to="/verse/public"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.systemRecommend") }}</span>
                </div>
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- 管理中心 (Conditional) -->
        <div
          v-if="ability.can('open', new AbilityRouter('/manager'))"
          class="nav-group"
        >
          <el-popover
            placement="right"
            :width="200"
            trigger="hover"
            :disabled="!collapsed"
            popper-class="sidebar-submenu-popover"
          >
            <template #reference>
              <div class="menu-trigger-wrapper">
                <div
                  class="sidebar-item"
                  :class="{ 'sidebar-item-has-children': !collapsed }"
                  @click="toggleMenu('admin')"
                >
                  <font-awesome-icon
                    :icon="['fas', 'sliders']"
                    class="sidebar-icon"
                  ></font-awesome-icon>
                  <span class="item-text">{{ t("sidebar.adminCenter") }}</span>
                  <font-awesome-icon
                    v-if="!collapsed"
                    :icon="['fas', 'chevron-right']"
                    class="menu-arrow"
                    :class="{ 'menu-arrow-open': menuOpen.admin }"
                  ></font-awesome-icon>
                </div>
              </div>
            </template>
            <div class="popover-menu">
              <router-link
                to="/manager/user"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.userManagement") }}</span>
                </div>
              </router-link>
              <router-link
                to="/phototype/list"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>{{ t("sidebar.prefabManagement") }}</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <Transition name="submenu-slide">
            <div v-show="!collapsed && menuOpen.admin" class="submenu">
              <router-link
                to="/manager/user"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.userManagement") }}</span>
                </div>
              </router-link>
              <router-link
                to="/phototype/list"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="sidebar-subitem"
                  :class="{ 'sidebar-subitem-active': isActive }"
                  @click="navigate"
                >
                  <span class="submenu-dot"></span>
                  <span>{{ t("sidebar.prefabManagement") }}</span>
                </div>
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- 实用工具 (三层目录: 实用工具 → 分组 → 具体插件) -->
        <div v-if="pluginStore.enabledPlugins.length > 0" class="nav-group">
          <el-popover
            placement="right"
            :width="220"
            trigger="hover"
            :disabled="!collapsed"
            popper-class="sidebar-submenu-popover"
          >
            <template #reference>
              <div class="menu-trigger-wrapper">
                <div
                  class="sidebar-item"
                  :class="{ 'sidebar-item-has-children': !collapsed }"
                  @click="toggleMenu('plugins')"
                >
                  <font-awesome-icon
                    :icon="['fas', 'toolbox']"
                    class="sidebar-icon"
                  ></font-awesome-icon>
                  <span class="item-text">{{ t("sidebar.tools") }}</span>
                  <font-awesome-icon
                    v-if="!collapsed"
                    :icon="['fas', 'chevron-right']"
                    class="menu-arrow"
                    :class="{ 'menu-arrow-open': menuOpen.plugins }"
                  ></font-awesome-icon>
                </div>
              </div>
            </template>
            <!-- Popover Content (collapsed mode) -->
            <div class="popover-menu">
              <template v-for="group in visibleMenuGroups" :key="group.id">
                <div class="popover-group-title">
                  {{
                    resolveI18nName(
                      group.name,
                      group.nameI18n,
                      appStore.language
                    )
                  }}
                </div>
                <template
                  v-for="plugin in getPluginsByGroup(group.id)"
                  :key="plugin.pluginId"
                >
                  <router-link
                    :to="`/plugins/${plugin.pluginId}`"
                    custom
                    v-slot="{ isActive, navigate }"
                  >
                    <div
                      class="popover-item"
                      :class="{ active: isActive }"
                      @click="navigate"
                    >
                      <span>{{
                        resolveI18nName(
                          plugin.name,
                          plugin.nameI18n,
                          appStore.language
                        )
                      }}</span>
                    </div>
                  </router-link>
                </template>
              </template>
            </div>
          </el-popover>

          <!-- Inline Submenu - 二级: 分组 -->
          <Transition name="submenu-slide">
            <div v-show="!collapsed && menuOpen.plugins" class="submenu">
              <template v-for="group in visibleMenuGroups" :key="group.id">
                <div
                  class="sidebar-subitem sidebar-subitem-group"
                  @click="toggleMenu(`plugin-group-${group.id}`)"
                >
                  <span class="submenu-dot"></span>
                  <span>{{
                    resolveI18nName(
                      group.name,
                      group.nameI18n,
                      appStore.language
                    )
                  }}</span>
                  <font-awesome-icon
                    :icon="['fas', 'chevron-right']"
                    class="menu-arrow menu-arrow-sm"
                    :class="{
                      'menu-arrow-open': menuOpen[`plugin-group-${group.id}`],
                    }"
                  ></font-awesome-icon>
                </div>
                <!-- 三级: 具体插件 -->
                <Transition name="submenu-slide">
                  <div
                    v-show="menuOpen[`plugin-group-${group.id}`]"
                    class="submenu submenu-level3"
                  >
                    <template
                      v-for="plugin in getPluginsByGroup(group.id)"
                      :key="plugin.pluginId"
                    >
                      <router-link
                        :to="`/plugins/${plugin.pluginId}`"
                        custom
                        v-slot="{ isActive, navigate }"
                      >
                        <div
                          class="sidebar-subitem sidebar-subitem-l3"
                          :class="{ 'sidebar-subitem-active': isActive }"
                          @click="navigate"
                        >
                          <span class="submenu-dot submenu-dot-sm"></span>
                          <span>{{
                            resolveI18nName(
                              plugin.name,
                              plugin.nameI18n,
                              appStore.language
                            )
                          }}</span>
                        </div>
                      </router-link>
                    </template>
                  </div>
                </Transition>
              </template>
            </div>
          </Transition>
        </div>
      </el-scrollbar>
    </nav>

    <!-- Bottom Section -->
    <div class="sidebar-bottom">
      <!-- Storage Widget - Temporarily disabled -->
      <!-- <StorageWidget v-show="!collapsed" /> -->

      <!-- Bottom Links -->
      <div class="bottom-links">
        <!-- <router-link to="/help" custom v-slot="{ isActive, navigate }">
          <div class="sidebar-item" :class="{ 'sidebar-item-active': isActive }" @click="navigate">
            <font-awesome-icon :icon="['fas', 'circle-question']" class="sidebar-icon" />
            <span class="item-text">帮助中心</span>
          </div>
        </router-link> -->
        <div class="sidebar-item logout-item" @click="handleLogout">
          <font-awesome-icon
            :icon="['fas', 'right-from-bracket']"
            class="sidebar-icon"
          ></font-awesome-icon>
          <span class="item-text">{{ t("sidebar.logout") }}</span>
        </div>
      </div>
    </div>

    <!-- 退出登录确认弹窗 -->
    <ConfirmDialog
      v-model="showLogoutDialog"
      :title="t('sidebar.logoutConfirmTitle')"
      :message="t('sidebar.logoutConfirmMessage')"
      :description="t('sidebar.logoutConfirmDesc')"
      type="warning"
      :confirm-text="t('sidebar.logout')"
      :cancel-text="t('common.cancel')"
      @confirm="confirmLogout"
    ></ConfirmDialog>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ConfirmDialog from "@/components/Dialog/ConfirmDialog.vue";
import { useUserStore } from "@/store";
import { useDomainStore } from "@/store/modules/domain";
import { useAbility } from "@casl/vue";
import { AbilityRouter } from "@/utils/ability";
import { usePluginSystemStore } from "@/store/modules/plugin-system";
import { useAppStoreHook } from "@/store/modules/app";
import { resolveI18nName } from "@/plugin-system/utils/i18n";

const { t } = useI18n();
const appStore = useAppStoreHook();

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();
const userStore = useUserStore();
const domainStore = useDomainStore();
const ability = useAbility();
const pluginStore = usePluginSystemStore();

// Initialize plugin system
pluginStore.init();

// Auto-expand submenus based on current route
const currentPath = computed(() => router.currentRoute.value.path);

const logoIcon = computed(() => domainStore.icon || "/icon.png");
const showLogoutDialog = ref(false);

// Submenu open/close state - auto-expand based on current route
const menuOpen = ref<Record<string, boolean>>({
  resource: currentPath.value.startsWith("/resource"),
  scene: currentPath.value.startsWith("/verse"),
  admin:
    currentPath.value.startsWith("/manager") ||
    currentPath.value.startsWith("/phototype"),
  plugins: currentPath.value.startsWith("/plugins"),
});

const toggleMenu = (key: string) => {
  menuOpen.value[key] = !menuOpen.value[key];
};

// Get plugins filtered by group
const getPluginsByGroup = (groupId: string) => {
  return pluginStore.pluginsByGroup.get(groupId) ?? [];
};

// 只显示有权限插件的分组
const visibleMenuGroups = computed(() => {
  return pluginStore.menuGroups.filter(
    (group) => (pluginStore.pluginsByGroup.get(group.id)?.length ?? 0) > 0
  );
});

// Auto-expand plugin sub-groups when store is initialized and on plugin route
watch(
  () => pluginStore.initialized,
  (initialized) => {
    if (!initialized || !currentPath.value.startsWith("/plugins")) return;
    const activePluginId = currentPath.value
      .split("/plugins/")[1]
      ?.split("?")[0];
    if (!activePluginId) return;
    // Find which group this plugin belongs to
    for (const [groupId, plugins] of pluginStore.pluginsByGroup) {
      if (plugins.some((p) => p.pluginId === activePluginId)) {
        menuOpen.value[`plugin-group-${groupId}`] = true;
        break;
      }
    }
  },
  { immediate: true }
);

const handleLogout = () => {
  showLogoutDialog.value = true;
};

const confirmLogout = async () => {
  showLogoutDialog.value = false;
  await userStore.logout();
  router.push("/site/logout");
};
</script>

<style lang="scss" scoped>
.ar-sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 16px;
  background-color: var(--menu-background);
  border-right: var(--border-width, 1px) solid var(--sidebar-border);
  transition: all 0.28s;

  &.collapsed {
    padding: 16px 8px; // Reduce padding in collapsed mode

    // User Request: Compact icon arrangement when collapsed
    // We target inner elements to reduce spacing

    :deep(.el-scrollbar__view) {
      gap: 8px !important; // Increase gap for visual separation if needed, or decrease for compactness. Let's try 8px first as default was 4px, but user wants "compact" arrangement?
      // Wait, user said "shorten menu container height, make icons arranged compactly"
      // Looking at the referenced image (which I recall), the icons were grouped tighter vertically.
      // Default gap in .sidebar-nav .el-scrollbar__view is 4px.
      // .sidebar-item height is 44px.
      // To make it compact, we should reduce gap or height.
      // Let's keep gap minimal (4px is already small) but reduce item height.
    }

    .sidebar-logo {
      justify-content: center;
      padding: 0;
      margin-bottom: 16px; // Reduce bottom margin

      .logo-icon {
        width: 32px;
        height: 32px;
      }
    }

    .sidebar-item {
      justify-content: center;
      height: 40px; // Reduce height from 44px to 40px for compact look
      padding: 0;
      margin-bottom: 0; // Ensure no extra margin

      .sidebar-icon {
        margin-right: 0;
      }
    }

    .nav-group {
      gap: 2px; // Tighter gap for groups
    }
  }
}

.sidebar-logo {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  margin-bottom: 24px;

  .logo-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: var(--shadow-sm, 0 1px 2px rgb(0 0 0 / 5%));

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .logo-text {
    overflow: hidden;
    font-size: 18px;
    font-weight: 700;
    color: var(--ar-text-primary);
    letter-spacing: -0.025em;
    white-space: nowrap;
    opacity: 1;
    transition:
      opacity 0.2s,
      width 0.2s;
  }
}

.sidebar-nav {
  flex: 1;
  overflow: hidden;

  :deep(.el-scrollbar__view) {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.item-text {
  width: auto;
  white-space: nowrap;
  opacity: 1;
  transition:
    opacity 0.2s,
    width 0.2s;
}

.collapsed {
  .logo-text {
    width: 0;
    margin: 0;
    opacity: 0;
    // Removed display: none to allow transition
  }

  .item-text {
    width: 0;
    margin: 0;
    opacity: 0;
    // Removed display: none to allow transition
  }
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--ar-text-secondary, #999);
  transition: transform 0.25s ease;

  &.menu-arrow-open {
    transform: rotate(90deg);
  }
}

.sidebar-item-has-children {
  cursor: pointer;
}

.submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 0;
}

// Submenu slide transition
.submenu-slide-enter-active,
.submenu-slide-leave-active {
  overflow: hidden;
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.submenu-slide-enter-to,
.submenu-slide-leave-from {
  max-height: 200px;
  opacity: 1;
}

.sidebar-subitem-group {
  display: flex;
  align-items: center;
  cursor: pointer;

  .menu-arrow-sm {
    margin-left: auto;
    font-size: 10px;
  }
}

.submenu-level3 {
  padding-left: 12px;
}

.sidebar-subitem-l3 {
  font-size: 13px;
}

.submenu-dot-sm {
  width: 4px !important;
  height: 4px !important;
}

.popover-group-title {
  padding: 6px 12px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ar-text-secondary, #999);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
  margin-top: auto;
}

.bottom-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logout-item {
  color: var(--ar-text-danger) !important;

  &:hover {
    background-color: var(--danger-light, rgb(239 68 68 / 10%)) !important;
  }

  .sidebar-icon {
    color: var(--ar-text-danger);
  }
}

.sidebar-item {
  .sidebar-icon {
    width: 24px;
    margin-right: 12px;
    font-size: 20px;
    text-align: center;
  }
}
</style>
