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
          <div
            class="flow-node clickable"
            @click="handleFlowAction('/resource/polygen/index')"
          >
            <div class="node-icon-wrapper">
              <font-awesome-icon
                :icon="['fas', 'cloud-arrow-up']"
                class="node-icon"
              ></font-awesome-icon>
            </div>
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step1")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.resource") }}</strong>
          </div>
          <div class="flow-arrow">→</div>
          <div
            class="flow-node clickable"
            @click="handleFlowAction('/meta/list')"
          >
            <div class="node-icon-wrapper">
              <font-awesome-icon
                :icon="['fas', 'pen-to-square']"
                class="node-icon"
              ></font-awesome-icon>
            </div>
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step2")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.entity") }}</strong>
          </div>
          <div class="flow-arrow">→</div>
          <div
            class="flow-node clickable"
            @click="handleFlowAction('/verse/index')"
          >
            <div class="node-icon-wrapper">
              <font-awesome-icon
                :icon="['fas', 'square-plus']"
                class="node-icon"
              ></font-awesome-icon>
            </div>
            <span class="node-kicker">{{
              t("homepage.concepts.flow.step3")
            }}</span>
            <strong>{{ t("homepage.concepts.flow.scene") }}</strong>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node flow-node-plain">
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
import { useRouter } from "vue-router";

import { useDomainStore } from "@/store/modules/domain";
import environment from "@/environment";
import LocalPage from "@/components/Home/LocalPage.vue";
import HomeHeader from "@/components/Home/HomeHeader.vue";
import PlatformOverview from "@/components/Home/PlatformOverview.vue";
import TransitionWrapper from "@/components/TransitionWrapper.vue";

const domainStore = useDomainStore();
const env = computed(() => environment);
const { t } = useI18n();
const router = useRouter();

const handleFlowAction = (path: string) => {
  router.push(path);
};
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100%;
  padding: 40px 120px;
  background: var(--bg-page);
  transition: padding var(--transition-normal);

  @media (width <= 1200px) {
    padding: 40px 60px;
  }

  @media (width <= 768px) {
    padding: 24px 20px;
  }
}

.api-info {
  display: none;
}

.section-header {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  padding: 0;
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
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

.concept-guide {
  padding: 24px;
  margin-bottom: 28px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 8%, white) 0%,
    var(--bg-card) 30%,
    var(--bg-card) 100%
  );
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
}

.concept-subtitle {
  margin: 0 0 18px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.concept-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  gap: 10px;
  align-items: center;
}

.flow-node {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  min-height: 78px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--primary-color) 6%, var(--bg-card));
  border: var(--border-width) solid
    color-mix(in srgb, var(--primary-color) 26%, var(--border-color));
  border-radius: 14px;

  strong {
    font-size: 16px;
    color: var(--text-primary);
  }
}

.flow-node-plain {
  background: color-mix(in srgb, var(--primary-color) 3%, var(--bg-card));
}

.clickable {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: color-mix(
      in srgb,
      var(--primary-color) 42%,
      var(--border-color)
    );
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}

.node-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: color-mix(in srgb, var(--primary-color) 14%, var(--bg-card));
  border-radius: 50%;
}

.node-icon {
  font-size: 14px;
  color: var(--primary-color);
}

.node-kicker {
  font-size: 12px;
  color: var(--text-secondary);
}

.flow-arrow {
  font-size: 20px;
  color: var(--text-secondary);
  text-align: center;
}

.scope-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.scope-card {
  padding: 14px 16px;
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: 14px;

  p {
    margin: 0;
    line-height: 1.65;
    color: var(--text-secondary);
  }
}

.scope-head {
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
  }
}

.scope-note {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-top: 10px !important;
  color: var(--warning-color, #f59e0b) !important;
}

@media (width <= 1200px) {
  .concept-flow {
    grid-template-columns: 1fr;
  }

  .flow-arrow {
    margin: -2px 0;
    transform: rotate(90deg);
  }
}

@media (width <= 900px) {
  .scope-grid {
    grid-template-columns: 1fr;
  }
}

.home-local-tabs {
  margin-top: var(--spacing-lg);
  overflow: hidden;
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
}
</style>
