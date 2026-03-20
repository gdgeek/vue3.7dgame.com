<template>
  <div class="quick-start-section">
    <div class="section-header">
      <font-awesome-icon
        :icon="['fas', 'bolt']"
        class="header-icon"
      ></font-awesome-icon>
      <h2 class="section-title">
        {{ t("homepage.quickStart.title") }}
      </h2>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="8" v-for="(item, index) in quickItems" :key="index">
        <div class="quick-card" @click="handleQuickAction(item.action)">
          <div
            class="card-icon-wrapper"
            :style="{ backgroundColor: item.bgColor }"
          >
            <font-awesome-icon
              :icon="item.icon"
              class="card-icon"
              :style="{ color: item.iconColor }"
            ></font-awesome-icon>
          </div>
          <div class="card-content">
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-desc">{{ item.desc }}</p>
          </div>
          <div class="card-action">
            <span class="action-text" :style="{ color: item.iconColor }">{{
              item.actionText
            }}</span>
            <font-awesome-icon
              :icon="['fas', 'arrow-right']"
              class="action-arrow"
              :style="{ color: item.iconColor }"
            ></font-awesome-icon>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

const quickItems = computed(() => [
  {
    title: t("homepage.quickStart.upload.title"),
    desc: t("homepage.quickStart.upload.desc"),
    actionText: t("homepage.quickStart.upload.action"),
    icon: ["fas", "cloud-arrow-up"] as string[],
    bgColor: "var(--primary-light)",
    iconColor: "var(--primary-color)",
    action: "/resource/polygen/index",
  },
  {
    title: t("homepage.quickStart.edit.title"),
    desc: t("homepage.quickStart.edit.desc"),
    actionText: t("homepage.quickStart.edit.action"),
    icon: ["fas", "pen-to-square"] as string[],
    bgColor: "var(--primary-light)",
    iconColor: "var(--primary-color)",
    action: "/meta/list",
  },
  {
    title: t("homepage.quickStart.create.title"),
    desc: t("homepage.quickStart.create.desc"),
    actionText: t("homepage.quickStart.create.action"),
    icon: ["fas", "square-plus"] as string[],
    bgColor: "var(--primary-light)",
    iconColor: "var(--primary-color)",
    action: "/verse/index",
  },
]);

const handleQuickAction = (path: string) => {
  router.push(path);
};
</script>

<style lang="scss" scoped>
.quick-start-section {
  margin: var(--spacing-xl) 0; // Removed horizontal margin
}

.section-header {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);
}

.header-icon {
  font-size: 28px;
  color: var(--primary-color, #03a9f4);
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.quick-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  min-height: 160px; // Further reduced height
  padding: 24px; // Reduced padding
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);

  &:hover {
    border-color: var(--primary-light);
    box-shadow: var(--shadow-md);
    transform: translateY(-5px);

    .card-icon {
      transform: scale(1.1);
    }

    .card-action {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.card-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-md); // Changed to rounded square
}

.card-icon {
  font-size: 24px; // Reduced icon size
  transition: transform var(--transition-normal);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg); // Reduced bottom margin
}

.card-title {
  margin: 0;
  font-size: 18px; // Increased title size
  font-weight: 600;
  color: var(--text-primary);
}

.card-desc {
  margin: 0;
  font-size: 13px; // Reduced font size
  line-height: 1.5;
  color: var(--text-secondary);
}

.card-action {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: auto;
  font-size: var(--font-size-md);
  font-weight: 600;
  opacity: 0;
  transition: all var(--transition-normal);
  transform: translateX(-10px);
}

.action-arrow {
  font-size: 20px;
}

@media (width <= 768px) {
  .quick-card {
    min-height: auto;
    margin-bottom: var(--spacing-md);

    .card-action {
      opacity: 1;
      transform: none;
    }
  }
}
</style>
