<template>
  <TransitionWrapper>
    <div class="home-page">
      <HomeHeader></HomeHeader>
      <el-divider class="home-divider"></el-divider>
      <QuickStart></QuickStart>

      <div class="section-header">
        <font-awesome-icon :icon="['fas', 'bullhorn']" class="header-icon" />
        <h2 class="section-title">
          {{ t("homepage.announcements.title") }}
        </h2>
      </div>

      <!-- 加载状态：骨架屏 -->
      <div v-if="loading" class="home-loading">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- 错误状态：错误提示 + 重试按钮 -->
      <div v-else-if="error" class="home-error">
        <el-empty description="加载失败，请重试">
          <el-button type="primary" @click="retry">重试</el-button>
        </el-empty>
      </div>

      <!-- 空状态：无内容提示 -->
      <div v-else-if="items.length === 0" class="home-empty">
        <el-empty description="暂无内容" />
      </div>

      <!-- 正常状态：传递 items 给 Book -->
      <Book v-else :items="items"></Book>

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
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useDomainStore } from "@/store/modules/domain";
import environment from "@/environment";
import { useCategories } from "@/composables/useCategories";
import Book from "@/components/Home/Book.vue";
import LocalPage from "@/components/Home/LocalPage.vue";
import HomeHeader from "@/components/Home/HomeHeader.vue";
import QuickStart from "@/components/Home/QuickStart.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

import type { TabItem } from "@/types/news";

const props = defineProps<{
  includeCategories?: (number | string)[];
  excludeCategories?: (number | string)[];
  pinnedItems?: TabItem[];
}>();

const domainStore = useDomainStore();
const env = computed(() => environment);
const { t } = useI18n();

const { items, loading, error, retry } = useCategories({
  includeCategories: props.includeCategories,
  excludeCategories: props.excludeCategories,
  pinnedItems: props.pinnedItems,
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

.home-loading,
.home-error,
.home-empty {
  padding: var(--spacing-xl) 0;
}
</style>
