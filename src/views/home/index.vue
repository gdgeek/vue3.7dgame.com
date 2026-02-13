<template>
  <TransitionWrapper>
    <div class="home-page">
      <HomeHeader />
      <el-divider class="home-divider" />
      <QuickStart />

      <div class="section-header">
        <span class="material-symbols-outlined header-icon">campaign</span>
        <h2 class="section-title">{{ t("homepage.announcements.title", "平台公告") }}</h2>
      </div>
      <Book :items="list"></Book>
      <el-tabs v-if="env.local()" type="border-card" lazy class="home-local-tabs">
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
import { useDomainStore } from "@/store/modules/domain";
import environment from "@/environment";
import Book from "@/components/Home/Book.vue";
import LocalPage from "@/components/Home/LocalPage.vue";
import HomeHeader from "@/components/Home/HomeHeader.vue";
import QuickStart from "@/components/Home/QuickStart.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const domainStore = useDomainStore();
const env = computed(() => environment);
const { t } = useI18n();

/*
const mrpp = computed(() => {
  return [
    { label: t("homepage.dashboard"), type: "document", id: 999 },
    { label: t("homepage.news"), type: "category", id: 74 },
    { label: t("homepage.relatedDownload"), type: "category", id: 77 },
    { label: t("homepage.caseCourse"), type: "category", id: 79 },
  ];
});*/

const list = computed(() => {
  return [
    { label: t("homepage.dashboard"), type: "document", id: 1455 },
    { label: t("homepage.news"), type: "category", id: 74 },
  ];
});
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
  display: none; // Hide API info
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);
  margin-top: var(--spacing-xl);
  padding: 0; // Removed padding for alignment
}

.header-icon {
  font-size: 28px; // Increased icon size
  color: var(--primary-color);
}

.section-title {
  font-size: 20px; // Increased font size
  font-weight: 600;
  margin: 0;
}

.home-divider {
  margin: var(--spacing-xl) 0;
  border-color: var(--border-color);
}

.home-local-tabs {
  margin-top: var(--spacing-lg);
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
</style>
