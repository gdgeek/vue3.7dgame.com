<template>
  <div class="platform-overview">
    <section class="overview-hero">
      <div class="overview-hero__content">
        <span class="overview-eyebrow">
          {{ t("homepage.overview.hero.eyebrow") }}
        </span>
        <h3>{{ t("homepage.overview.hero.title") }}</h3>
        <p>{{ t("homepage.overview.hero.description") }}</p>
        <div class="overview-actions">
          <el-button
            type="primary"
            @click="goInternal('/resource/polygen/index')"
          >
            {{ t("homepage.overview.hero.actions.resources") }}
          </el-button>
          <el-button @click="goInternal('/meta/list')">
            {{ t("homepage.overview.hero.actions.entities") }}
          </el-button>
          <el-button @click="goInternal('/verse/index')">
            {{ t("homepage.overview.hero.actions.scenes") }}
          </el-button>
        </div>
      </div>

      <div class="overview-hero__visual">
        <div class="platform-shell">
          <div class="platform-shell__top">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="platform-shell__body">
            <div class="platform-shell__sidebar">
              <div
                v-for="item in sidebarItems"
                :key="item"
                class="platform-shell__nav"
              >
                {{ item }}
              </div>
            </div>
            <div class="platform-shell__main">
              <div class="platform-shell__panel platform-shell__panel--wide">
                <span>{{
                  t("homepage.overview.hero.preview.main.label")
                }}</span>
                <strong>{{
                  t("homepage.overview.hero.preview.main.title")
                }}</strong>
              </div>
              <div class="platform-shell__row">
                <div class="platform-shell__panel">
                  <span>{{
                    t("homepage.overview.hero.preview.build.label")
                  }}</span>
                  <strong>{{
                    t("homepage.overview.hero.preview.build.title")
                  }}</strong>
                </div>
                <div class="platform-shell__panel">
                  <span>{{
                    t("homepage.overview.hero.preview.interaction.label")
                  }}</span>
                  <strong>{{
                    t("homepage.overview.hero.preview.interaction.title")
                  }}</strong>
                </div>
              </div>
              <div class="platform-shell__footer">
                {{ t("homepage.overview.hero.preview.footer") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="overview-section">
      <div class="section-heading">
        <span class="section-kicker">
          {{ t("homepage.overview.sections.structure.kicker") }}
        </span>
        <h4>{{ t("homepage.overview.sections.structure.title") }}</h4>
      </div>

      <div class="overview-grid overview-grid--3">
        <article
          v-for="item in platformModules"
          :key="item.title"
          class="module-card"
        >
          <span class="module-card__badge">{{ item.badge }}</span>
          <h5>{{ item.title }}</h5>
          <p>{{ item.desc }}</p>
          <div class="module-card__meta">
            <span>{{ item.tag }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="overview-section">
      <div class="section-heading">
        <span class="section-kicker">
          {{ t("homepage.overview.sections.capabilities.kicker") }}
        </span>
        <h4>{{ t("homepage.overview.sections.capabilities.title") }}</h4>
      </div>

      <div class="overview-grid overview-grid--5">
        <article
          v-for="item in capabilityCards"
          :key="item.title"
          class="capability-card"
        >
          <span class="capability-card__index">{{ item.index }}</span>
          <h5>{{ item.title }}</h5>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="overview-section overview-section--flow">
      <div class="section-heading">
        <span class="section-kicker">
          {{ t("homepage.overview.sections.workflow.kicker") }}
        </span>
        <h4>{{ t("homepage.overview.sections.workflow.title") }}</h4>
      </div>

      <div class="journey-card">
        <div class="journey-steps">
          <div
            v-for="item in workflowSteps"
            :key="item.step"
            class="journey-step"
          >
            <div class="journey-step__number">{{ item.step }}</div>
            <div class="journey-step__body">
              <h5>{{ item.title }}</h5>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="overview-section">
      <div class="section-heading">
        <span class="section-kicker">
          {{ t("homepage.overview.sections.value.kicker") }}
        </span>
        <h4>{{ t("homepage.overview.sections.value.title") }}</h4>
      </div>

      <div class="overview-grid overview-grid--2">
        <article class="highlight-card">
          <h5>{{ t("homepage.overview.value.scenariosTitle") }}</h5>
          <div class="highlight-list">
            <div
              v-for="item in scenarioCards"
              :key="item.title"
              class="highlight-list__item"
            >
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </article>

        <article class="highlight-card">
          <h5>{{ t("homepage.overview.value.advantagesTitle") }}</h5>
          <ul class="advantage-list">
            <li v-for="item in advantageList" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="overview-section">
      <div class="section-heading">
        <span class="section-kicker">
          {{ t("homepage.overview.sections.collaboration.kicker") }}
        </span>
        <h4>{{ t("homepage.overview.sections.collaboration.title") }}</h4>
      </div>

      <div class="overview-grid overview-grid--2">
        <article class="integration-card">
          <h5>{{ t("homepage.overview.collaboration.build.title") }}</h5>
          <p>{{ t("homepage.overview.collaboration.build.desc") }}</p>
        </article>

        <article class="integration-card">
          <h5>{{ t("homepage.overview.collaboration.interaction.title") }}</h5>
          <p>{{ t("homepage.overview.collaboration.interaction.desc") }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const router = useRouter();
const { t } = useI18n();

const sidebarItems = computed(() => [
  t("homepage.overview.nav.home"),
  t("homepage.overview.nav.resources"),
  t("homepage.overview.nav.entities"),
  t("homepage.overview.nav.scenes"),
  t("homepage.overview.nav.management"),
]);

const platformModules = computed(() => [
  {
    badge: "01",
    title: t("homepage.overview.structure.platform.title"),
    desc: t("homepage.overview.structure.platform.desc"),
    tag: t("homepage.overview.structure.platform.tag"),
  },
  {
    badge: "02",
    title: t("homepage.overview.structure.builder.title"),
    desc: t("homepage.overview.structure.builder.desc"),
    tag: t("homepage.overview.structure.builder.tag"),
  },
  {
    badge: "03",
    title: t("homepage.overview.structure.interaction.title"),
    desc: t("homepage.overview.structure.interaction.desc"),
    tag: t("homepage.overview.structure.interaction.tag"),
  },
]);

const capabilityCards = computed(() => [
  {
    index: "01",
    title: t("homepage.overview.capabilities.resource.title"),
    desc: t("homepage.overview.capabilities.resource.desc"),
  },
  {
    index: "02",
    title: t("homepage.overview.capabilities.entity.title"),
    desc: t("homepage.overview.capabilities.entity.desc"),
  },
  {
    index: "03",
    title: t("homepage.overview.capabilities.building.title"),
    desc: t("homepage.overview.capabilities.building.desc"),
  },
  {
    index: "04",
    title: t("homepage.overview.capabilities.interaction.title"),
    desc: t("homepage.overview.capabilities.interaction.desc"),
  },
  {
    index: "05",
    title: t("homepage.overview.capabilities.delivery.title"),
    desc: t("homepage.overview.capabilities.delivery.desc"),
  },
]);

const workflowSteps = computed(() => [
  {
    step: "1",
    title: t("homepage.overview.workflow.step1.title"),
    desc: t("homepage.overview.workflow.step1.desc"),
  },
  {
    step: "2",
    title: t("homepage.overview.workflow.step2.title"),
    desc: t("homepage.overview.workflow.step2.desc"),
  },
  {
    step: "3",
    title: t("homepage.overview.workflow.step3.title"),
    desc: t("homepage.overview.workflow.step3.desc"),
  },
  {
    step: "4",
    title: t("homepage.overview.workflow.step4.title"),
    desc: t("homepage.overview.workflow.step4.desc"),
  },
  {
    step: "5",
    title: t("homepage.overview.workflow.step5.title"),
    desc: t("homepage.overview.workflow.step5.desc"),
  },
]);

const scenarioCards = computed(() => [
  {
    title: t("homepage.overview.value.scenarios.education.title"),
    desc: t("homepage.overview.value.scenarios.education.desc"),
  },
  {
    title: t("homepage.overview.value.scenarios.branding.title"),
    desc: t("homepage.overview.value.scenarios.branding.desc"),
  },
  {
    title: t("homepage.overview.value.scenarios.exhibition.title"),
    desc: t("homepage.overview.value.scenarios.exhibition.desc"),
  },
  {
    title: t("homepage.overview.value.scenarios.delivery.title"),
    desc: t("homepage.overview.value.scenarios.delivery.desc"),
  },
]);

const advantageList = computed(() => [
  t("homepage.overview.value.advantages.item1"),
  t("homepage.overview.value.advantages.item2"),
  t("homepage.overview.value.advantages.item3"),
  t("homepage.overview.value.advantages.item4"),
  t("homepage.overview.value.advantages.item5"),
]);

const goInternal = (path: string) => {
  router.push(path);
};
</script>

<style lang="scss" scoped>
.platform-overview {
  --overview-soft-bg: color-mix(
    in srgb,
    var(--primary-color) 4%,
    var(--bg-card)
  );
  --overview-soft-bg-strong: color-mix(
    in srgb,
    var(--primary-color) 10%,
    var(--bg-card)
  );
  --overview-soft-border: color-mix(
    in srgb,
    var(--primary-color) 24%,
    var(--border-color)
  );
  --overview-soft-text: color-mix(
    in srgb,
    var(--primary-color) 72%,
    var(--text-primary)
  );

  display: flex;
  flex-direction: column;
  gap: 22px;
}

.overview-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
  padding: 30px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at top left,
      color-mix(in srgb, var(--primary-color) 18%, transparent) 0%,
      transparent 35%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary-color) 6%, var(--bg-card)) 0%,
      var(--bg-card) 48%,
      color-mix(in srgb, var(--primary-color) 4%, var(--bg-hover)) 100%
    );
  box-shadow: var(--shadow-sm);
}

.overview-eyebrow,
.section-kicker,
.module-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--overview-soft-bg-strong);
  color: var(--overview-soft-text);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.overview-hero__content h3 {
  margin: 10px 0 14px;
  color: var(--text-primary);
  font-size: 34px;
  line-height: 1.15;
}

.overview-hero__content p {
  max-width: 620px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.9;
}

.overview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.overview-hero__visual {
  display: flex;
  align-items: center;
  justify-content: center;
}

.platform-shell {
  width: 100%;
  max-width: 460px;
  overflow: hidden;
  border: var(--border-width) solid var(--overview-soft-border);
  border-radius: 22px;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.platform-shell__top {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg-hover);
}

.platform-shell__top span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary-color) 32%, var(--border-color));
}

.platform-shell__body {
  display: grid;
  grid-template-columns: 110px 1fr;
  min-height: 280px;
}

.platform-shell__sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 12px;
  background: color-mix(in srgb, var(--primary-color) 5%, var(--bg-hover));
}

.platform-shell__nav {
  padding: 10px 12px;
  border: var(--border-width) solid var(--overview-soft-border);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
}

.platform-shell__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
}

.platform-shell__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.platform-shell__panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 92px;
  padding: 16px;
  border: var(--border-width) solid var(--overview-soft-border);
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 8%, var(--bg-card)) 0%,
    var(--bg-card) 100%
  );
}

.platform-shell__panel--wide {
  min-height: 112px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 14%, var(--bg-card)) 0%,
    color-mix(in srgb, var(--primary-color) 6%, var(--bg-card)) 100%
  );
}

.platform-shell__panel span,
.platform-shell__footer {
  color: var(--text-secondary);
  font-size: 12px;
}

.platform-shell__panel strong {
  margin-top: 8px;
  color: var(--text-primary);
  font-size: 18px;
}

.platform-shell__footer {
  padding: 14px 16px;
  border: var(--border-width) solid var(--overview-soft-border);
  border-radius: 16px;
  background: var(--bg-card);
  line-height: 1.6;
}

.overview-section {
  padding: 24px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 22px;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.overview-section--flow {
  background: linear-gradient(
    180deg,
    var(--bg-card) 0%,
    color-mix(in srgb, var(--primary-color) 4%, var(--bg-hover)) 100%
  );
}

.section-heading {
  margin-bottom: 18px;
}

.section-heading h4,
.module-card h5,
.capability-card h5,
.journey-step__body h5,
.highlight-card h5,
.integration-card h5 {
  margin: 10px 0 0;
  color: var(--text-primary);
}

.overview-grid {
  display: grid;
  gap: 16px;
}

.overview-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.overview-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-grid--5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.module-card,
.capability-card,
.highlight-card,
.integration-card {
  padding: 20px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 20px;
  background: linear-gradient(
    180deg,
    var(--bg-card) 0%,
    color-mix(in srgb, var(--primary-color) 2%, var(--bg-card)) 100%
  );
}

.module-card p,
.capability-card p,
.journey-step__body p,
.highlight-list__item p,
.integration-card p,
.advantage-list li {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.8;
}

.module-card__meta {
  display: flex;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--overview-soft-bg);
}

.module-card__meta span {
  color: var(--overview-soft-text);
  font-size: 13px;
  font-weight: 700;
}

.capability-card__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--primary-color) 88%, white) 0%,
    var(--primary-color) 100%
  );
  color: var(--text-inverse);
  font-weight: 800;
}

.journey-card {
  padding: 20px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 20px;
  background: color-mix(in srgb, var(--primary-color) 2%, var(--bg-card));
}

.journey-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.journey-step {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: var(--border-width) solid var(--overview-soft-border);
  border-radius: 18px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--primary-color) 6%, var(--bg-card)) 0%,
    var(--bg-card) 100%
  );
}

.journey-step__number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--overview-soft-bg-strong);
  color: var(--overview-soft-text);
  font-weight: 800;
}

.highlight-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.highlight-list__item {
  padding: 16px;
  border: var(--border-width) solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-hover);
}

.highlight-list__item strong {
  color: var(--text-primary);
}

.advantage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 14px 0 0;
  padding-left: 20px;
}

@media (max-width: 1200px) {
  .overview-hero,
  .overview-grid--3,
  .overview-grid--5,
  .journey-steps {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .overview-grid--2,
  .platform-shell__body,
  .platform-shell__row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .overview-hero {
    padding: 22px;
    border-radius: 20px;
  }

  .overview-hero__content h3 {
    font-size: 28px;
  }

  .overview-section {
    padding: 18px;
  }

  .overview-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
