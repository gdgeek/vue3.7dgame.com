<template>
  <TransitionWrapper>
    <div class="home-page">
      <HomeHeader></HomeHeader>
      <el-divider class="home-divider"></el-divider>

      <div class="section-header">
        <font-awesome-icon
          :icon="['fas', 'bullhorn']"
          class="header-icon"
        ></font-awesome-icon>
        <h2 class="section-title">
          {{ t("homepage.announcements.title") }}
        </h2>
      </div>

      <PlatformOverview></PlatformOverview>

      <el-tabs v-if="env.local()" type="border-card" class="home-local-tabs">
        <el-tab-pane :label="domainStore.title">
          <LocalPage></LocalPage>
        </el-tab-pane>
      </el-tabs>
      <div class="api-info">
        <span>API: {{ env.api }}</span>
      </div>
    </div>
  </TransitionWrapper>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useDomainStore } from "@/store/modules/domain";
import environment from "@/environment";
import LocalPage from "@/components/Home/LocalPage.vue";
import HomeHeader from "@/components/Home/HomeHeader.vue";
import PlatformOverview from "@/components/Home/PlatformOverview.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const domainStore = useDomainStore();
const env = computed(() => environment);
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.home-page {
  padding: 40px 120px;
  background: var(--bg-page);
  min-height: 100%;
  transition: padding var(--transition-normal);

  @media (max-width: 1200px) {
    padding: 40px 60px;
  }

  @media (max-width: 768px) {
    padding: 24px 20px;
  }
}

.api-info {
  display: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  padding: 0;
  color: var(--text-primary);
}

.header-icon {
  font-size: 28px;
  color: var(--primary-color);
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.home-divider {
  margin: var(--spacing-xl) 0;
  border-color: var(--border-color);
}

.home-local-tabs {
  margin-top: var(--spacing-lg);
  overflow: hidden;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
}
</style>
