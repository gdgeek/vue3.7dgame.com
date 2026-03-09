<template>
  <footer class="app-footer" :class="{ 'dark-mode': isDarkMode }">
    <div class="footer-content">
      <div class="footer-links">
        <template v-for="(link, index) in domainStore.links" :key="link.url">
          <a :href="link.url" target="_blank" class="footer-link">
            {{ link.name }}
          </a>
          <span v-if="index < domainStore.links.length - 1" class="divider"
            >|</span
          >
        </template>
      </div>
      <div class="footer-version">版本 {{ versionTag }}</div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDomainStore } from "@/store/modules/domain";
import { useSettingsStore } from "@/store/modules/settings";
import { ThemeEnum } from "@/enums/ThemeEnum";

const domainStore = useDomainStore();
const settingsStore = useSettingsStore();

const isDarkMode = computed(() => settingsStore.theme === ThemeEnum.DARK);
const { buildTimestamp } = __APP_INFO__;
const d = new Date(buildTimestamp);
const pad = (n: number) => String(n).padStart(2, "0");
const versionTag = computed(
  () =>
    `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
);

defineProps<{
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
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: flex-end; // Changed from space-between to align right
  max-width: 1400px;
  margin: 0 auto;

  @media (width <= 640px) {
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
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;

  @media (width <= 640px) {
    justify-content: center;
  }
}

.footer-link {
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s;
}

.divider {
  font-size: 12px;
}

.footer-version {
  font-size: 12px;
  white-space: nowrap;
  opacity: 0.8;
}
</style>
