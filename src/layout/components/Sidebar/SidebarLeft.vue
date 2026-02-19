<template>
  <aside class="ar-sidebar" :class="{ collapsed: collapsed }">
    <!-- Logo Section -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <img alt="Logo" src="/icon.png" />
      </div>
      <span class="logo-text">不加班AR创作平台</span>
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
            <span class="material-symbols-outlined">home</span>
            <span class="item-text">主页</span>
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
                <div class="sidebar-item">
                  <span class="material-symbols-outlined">category</span>
                  <span class="item-text">素材库</span>
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
                  <span>模型</span>
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
                  <span>图片</span>
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
                  <span>音频</span>
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
                  <span>视频</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <!-- Inline Submenu - Hidden when collapsed -->
          <div v-show="!collapsed" class="submenu">
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
                <span>模型</span>
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
                <span>图片</span>
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
                <span>音频</span>
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
                <span>视频</span>
              </div>
            </router-link>
          </div>
        </div>

        <!-- 实体 -->
        <router-link to="/meta/list" custom v-slot="{ isActive, navigate }">
          <div
            class="sidebar-item"
            :class="{ 'sidebar-item-active': isActive }"
            @click="navigate"
          >
            <span class="material-symbols-outlined">token</span>
            <span class="item-text">实体</span>
          </div>
        </router-link>

        <!-- AI 创作 (Conditional) -->
        <div
          v-if="ability.can('open', new AbilityRouter('/ai'))"
          class="nav-group"
        >
          <router-link to="/ai/list" custom v-slot="{ isActive, navigate }">
            <div
              class="sidebar-item"
              :class="{ 'sidebar-item-active': isActive }"
              @click="navigate"
            >
              <span class="material-symbols-outlined">smart_toy</span>
              <span class="item-text">AI 创作</span>
            </div>
          </router-link>
        </div>

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
                <router-link to="/verse" custom v-slot="{ navigate }">
                  <div
                    class="sidebar-item"
                    :class="{ 'sidebar-item-active': isExactActive('/verse') }"
                    @click="navigate"
                  >
                    <span class="material-symbols-outlined">layers</span>
                    <span class="item-text">场景</span>
                  </div>
                </router-link>
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
                  <span>自己创造</span>
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
                  <span>系统推荐</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <!-- Inline Submenu - Hidden when collapsed -->
          <div v-show="!collapsed" class="submenu">
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
                <span>自己创造</span>
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
                <span>系统推荐</span>
              </div>
            </router-link>
          </div>
        </div>

        <!-- 校园管理 (Conditional) -->
        <div
          v-if="ability.can('open', new AbilityRouter('/campus'))"
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
                <div class="sidebar-item">
                  <span class="material-symbols-outlined">corporate_fare</span>
                  <span class="item-text">校园管理</span>
                </div>
              </div>
            </template>
            <div class="popover-menu">
              <router-link
                to="/campus/school"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>学校管理</span>
                </div>
              </router-link>
              <router-link
                to="/campus/teacher"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>老师管理</span>
                </div>
              </router-link>
              <router-link
                to="/campus/student"
                custom
                v-slot="{ isActive, navigate }"
              >
                <div
                  class="popover-item"
                  :class="{ active: isActive }"
                  @click="navigate"
                >
                  <span>学生管理</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <div v-show="!collapsed" class="submenu">
            <router-link
              to="/campus/school"
              custom
              v-slot="{ isActive, navigate }"
            >
              <div
                class="sidebar-subitem"
                :class="{ 'sidebar-subitem-active': isActive }"
                @click="navigate"
              >
                <span class="submenu-dot"></span>
                <span>学校管理</span>
              </div>
            </router-link>
            <router-link
              to="/campus/teacher"
              custom
              v-slot="{ isActive, navigate }"
            >
              <div
                class="sidebar-subitem"
                :class="{ 'sidebar-subitem-active': isActive }"
                @click="navigate"
              >
                <span class="submenu-dot"></span>
                <span>老师管理</span>
              </div>
            </router-link>
            <router-link
              to="/campus/student"
              custom
              v-slot="{ isActive, navigate }"
            >
              <div
                class="sidebar-subitem"
                :class="{ 'sidebar-subitem-active': isActive }"
                @click="navigate"
              >
                <span class="submenu-dot"></span>
                <span>学生管理</span>
              </div>
            </router-link>
          </div>
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
                <div class="sidebar-item">
                  <span class="material-symbols-outlined"
                    >display_settings</span
                  >
                  <span class="item-text">管理中心</span>
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
                  <span>用户管理</span>
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
                  <span>预制体管理</span>
                </div>
              </router-link>
            </div>
          </el-popover>

          <div v-show="!collapsed" class="submenu">
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
                <span>用户管理</span>
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
                <span>预制体管理</span>
              </div>
            </router-link>
          </div>
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
            <span class="material-symbols-outlined">help</span>
            <span class="item-text">帮助中心</span>
          </div>
        </router-link> -->
        <div class="sidebar-item logout-item" @click="handleLogout">
          <span class="material-symbols-outlined">logout</span>
          <span class="item-text">退出登录</span>
        </div>
      </div>
    </div>

    <!-- 退出登录确认弹窗 -->
    <ConfirmDialog
      v-model="showLogoutDialog"
      title="退出登录"
      message="确定要退出登录吗？"
      description="退出后需要重新登录才能访问您的账户。"
      type="warning"
      confirm-text="退出登录"
      cancel-text="取消"
      @confirm="confirmLogout"
    ></ConfirmDialog>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import StorageWidget from "./StorageWidget.vue";
import ConfirmDialog from "@/components/Dialog/ConfirmDialog.vue";
import { useUserStore } from "@/store";
import { useAbility } from "@casl/vue";
import { AbilityRouter } from "@/utils/ability";

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const ability = useAbility();

const showLogoutDialog = ref(false);

// Check if route is exactly active (for parent menus)
const isExactActive = (path: string) => {
  return route.path === path;
};

// Check if any resource sub-route is active
const isResourceActive = computed(() => {
  return route.path.startsWith("/resource");
});

const handleLogout = () => {
  showLogoutDialog.value = true;
};

const confirmLogout = async () => {
  showLogoutDialog.value = false;
  await userStore.logout();
  router.push("/login");
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
      padding: 0;
      height: 40px; // Reduce height from 44px to 40px for compact look
      margin-bottom: 0; // Ensure no extra margin

      .material-symbols-outlined {
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
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;

  .logo-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .logo-text {
    font-weight: 700;
    font-size: 18px;
    letter-spacing: -0.025em;
    color: var(--ar-text-primary);
    white-space: nowrap;
    opacity: 1;
    transition:
      opacity 0.2s,
      width 0.2s;
    overflow: hidden;
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
  white-space: nowrap;
  opacity: 1;
  width: auto;
  transition:
    opacity 0.2s,
    width 0.2s;
}

.collapsed {
  .logo-text {
    opacity: 0;
    width: 0;
    margin: 0;
    // Removed display: none to allow transition
  }

  .item-text {
    opacity: 0;
    width: 0;
    margin: 0;
    // Removed display: none to allow transition
  }
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 0;
}

.sidebar-bottom {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bottom-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logout-item {
  color: var(--ar-text-danger) !important;

  &:hover {
    background-color: var(--danger-light, rgba(239, 68, 68, 0.1)) !important;
  }

  .material-symbols-outlined {
    color: var(--ar-text-danger);
  }
}

.sidebar-item {
  .material-symbols-outlined {
    margin-right: 12px;
    font-size: 24px;
  }
}
</style>
