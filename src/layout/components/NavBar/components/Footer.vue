<template>
  <footer class="app-footer" :class="{ 'dark-mode': isDarkMode }">
    <div class="footer-content">

      <div class="footer-links">
        <template v-for="(link, index) in domainStore.links" :key="link.url">
          <a :href="link.url" target="_blank" class="footer-link">
            {{ link.name }}
          </a>
          <span v-if="index < domainStore.links.length - 1" class="divider">|</span>
        </template>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDomainStore } from '@/store/modules/domain';
import { useSettingsStore } from '@/store/modules/settings';
import { ThemeEnum } from '@/enums/ThemeEnum';

const domainStore = useDomainStore();
const settingsStore = useSettingsStore();

const isDarkMode = computed(() => settingsStore.theme === ThemeEnum.DARK);

const props = defineProps<{
  maxwidth?: boolean;
}>();
</script>

<style lang="scss" scoped>
// 使用全局主题变量
.app-footer {
  width: 100%;
  padding: 16px 24px;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end; // Changed from space-between to align right
  gap: 24px;

  @media (max-width: 640px) {
    flex-direction: column;
    gap: 12px;
  }
}

.footer-logo {
  display: flex;
  align-items: center;

  .logo-img {
    width: 28px;
    height: 28px;
    opacity: 0.7;
  }
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 640px) {
    justify-content: center;
  }
}

.footer-link {
  font-size: 12px;
  text-decoration: none;
  transition: color 0.2s;
  white-space: nowrap;
}

.divider {
  font-size: 12px;
}
</style>
