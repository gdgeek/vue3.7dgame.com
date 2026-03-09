<template>
  <TransitionWrapper>
    <div class="home-page">
      <HomeHeader></HomeHeader>
      <el-divider class="home-divider"></el-divider>

      <div class="section-header">
        <font-awesome-icon
          :icon="['fas', 'circle-question']"
          class="header-icon"
        ></font-awesome-icon>
        <h2 class="section-title">{{ t("homepage.concepts.title") }}</h2>
      </div>

      <section class="concept-guide">
        <p class="concept-subtitle">{{ t("homepage.concepts.subtitle") }}</p>

        <div class="concept-flow">
          <div class="flow-node">
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step1")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.resource") }}</strong>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node">
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step2")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.entity") }}</strong>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node">
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step3")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.scene") }}</strong>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node">
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step4")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.publish") }}</strong>
          </div>
        </div>

        <div class="scope-grid">
          <article class="scope-card entity-scope">
            <header class="scope-head">
              <h3>{{ t("homepage.concepts.entityEditor.title") }}</h3>
            </header>
            <p>{{ t("homepage.concepts.entityEditor.desc") }}</p>
          </article>
          <article class="scope-card scene-scope">
            <header class="scope-head">
              <h3>{{ t("homepage.concepts.sceneEditor.title") }}</h3>
            </header>
            <p>{{ t("homepage.concepts.sceneEditor.desc") }}</p>
            <p class="scope-note">
              <font-awesome-icon
                :icon="['fas', 'triangle-exclamation']"
              ></font-awesome-icon>
              <span>{{ t("homepage.concepts.rule") }}</span>
            </p>
          </article>
        </div>
      </section>

      <QuickStart></QuickStart>

      <div class="section-header">
        <font-awesome-icon
          :icon="['fas', 'bullhorn']"
          class="header-icon"
        ></font-awesome-icon>
        <h2 class="section-title">
          {{ t("homepage.announcements.title") }}
        </h2>
      </div>

      <!-- 加载状态：骨架屏 -->
      <div v-if="loading" class="home-loading">
        <el-skeleton :rows="4" animated></el-skeleton>
      </div>

      <!-- 错误状态：错误提示 + 重试按钮 -->
      <div v-else-if="error" class="home-error">
        <el-empty description="加载失败，请重试">
          <el-button type="primary" @click="retry">重试</el-button>
        </el-empty>
      </div>

      <!-- 空状态：无内容提示 -->
      <div v-else-if="items.length === 0" class="home-empty">
        <el-empty description="暂无内容"></el-empty>
      </div>

      <!-- 正常状态：传递 items 给 Book -->
      <Book v-else :items="items"></Book>

      <el-tabs
        v-if="env.local()"
        type="border-card"
        lazy
        class="home-local-tabs"
      >
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

.concept-guide {
  margin-bottom: 28px;
  padding: 24px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 8%, white) 0%,
    var(--bg-card) 30%,
    var(--bg-card) 100%
  );
}

.concept-subtitle {
  margin: 0 0 18px;
  color: var(--text-secondary);
  line-height: 1.65;
}

.concept-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  gap: 10px;
  align-items: center;
}

.flow-node {
  border: var(--border-width) solid
    color-mix(in srgb, var(--primary-color) 26%, var(--border-color));
  background: color-mix(in srgb, var(--primary-color) 6%, var(--bg-card));
  border-radius: 14px;
  padding: 14px 16px;
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.node-kicker {
  font-size: 12px;
  color: var(--text-secondary);
}

.flow-node strong {
  font-size: 16px;
  color: var(--text-primary);
}

.flow-arrow {
  color: var(--primary-color);
  font-weight: 700;
  font-size: 20px;
}

.scope-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.scope-card {
  border-radius: 14px;
  border: var(--border-width) solid var(--border-color);
  background: var(--bg-card);
  padding: 14px;
}

.scope-head {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.scope-card h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.scope-card p {
  margin: 0;
  line-height: 1.65;
  color: var(--text-secondary);
}

.scope-note {
  margin-top: 8px !important;
  border-radius: 10px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--primary-color) 10%, var(--bg-card));
  color: var(--text-primary) !important;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 1024px) {
  .concept-flow {
    grid-template-columns: 1fr;
  }

  .flow-arrow {
    display: none;
  }

  .scope-grid {
    grid-template-columns: 1fr;
  }
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
