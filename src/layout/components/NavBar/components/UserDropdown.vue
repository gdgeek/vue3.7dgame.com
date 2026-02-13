<template>
  <div class="user-profile" ref="profileRef">
    <button class="profile-trigger" @click="toggleMenu">
      <div class="profile-info">
        <div class="profile-name">{{ userName }}</div>
        <div class="account-badge">{{ accountType }}</div>
      </div>
      <div class="user-avatar">
        <img :src="avatarUrl" alt="User Profile" />
      </div>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div v-if="isMenuOpen" class="dropdown-menu">
        <router-link 
          to="/settings/edit" 
          class="dropdown-item"
          @click="closeMenu"
        >
          <span class="material-symbols-outlined">settings</span>
          <span>个人设置</span>
        </router-link>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item danger" @click="handleLogout">
          <span class="material-symbols-outlined">logout</span>
          <span>退出登录</span>
        </div>
      </div>
    </Transition>

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
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import ConfirmDialog from '@/components/Dialog/ConfirmDialog.vue';
import { useUserStore } from '@/store';

const router = useRouter();
const userStore = useUserStore();
const profileRef = ref<HTMLElement | null>(null);
const isMenuOpen = ref(false);
const showLogoutDialog = ref(false);

// 从用户数据中获取名称
const userName = computed(() => {
  if (userStore.userInfo?.userData?.nickname) {
    return userStore.userInfo.userData.nickname;
  }
  if (userStore.userInfo?.userData?.username) {
    return userStore.userInfo.userData.username;
  }
  return '用户';
});

// 账户类型 - 可根据 roles 判断
const accountType = computed(() => {
  const roles = userStore.userInfo?.roles || [];
  if (roles.includes('root') || roles.includes('admin')) {
    return '管理员账户';
  }
  return '普通账户';
});

// 从用户数据中获取头像URL
const avatarUrl = computed(() => {
  if (userStore.userInfo?.userInfo?.avatar?.url) {
    return userStore.userInfo.userInfo.avatar.url;
  }
  // 默认头像
  return '/local/ar_logo.png';
});

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const handleLogout = () => {
  closeMenu();
  showLogoutDialog.value = true;
};

const confirmLogout = async () => {
  showLogoutDialog.value = false;
  await userStore.logout();
  router.push('/login');
};

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (profileRef.value && !profileRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
.user-profile {
  position: relative;
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.profile-info {
  text-align: right;
  display: none;

  @media (min-width: 640px) {
    display: block;
  }
}

.profile-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ar-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
