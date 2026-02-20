<template>
  <div class="quick-start-section">
    <div class="section-header">
      <font-awesome-icon :icon="['fas', 'bolt']" class="header-icon" />
      <h2 class="section-title">
        {{ t("homepage.quickStart.title") }}
      </h2>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="8" v-for="(item, index) in quickItems" :key="index">
        <div class="quick-card" @click="handleQuickAction(item.action)">
          <div class="card-icon-wrapper" :style="{ backgroundColor: item.bgColor }">
            <font-awesome-icon :icon="item.icon" class="card-icon" :style="{ color: item.iconColor }" />
          </div>
          <div class="card-content">
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-desc">{{ item.desc }}</p>
          </div>
          <div class="card-action">
            <span class="action-text" :style="{ color: item.iconColor }">{{ item.actionText }}</span>
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="action-arrow" :style="{ color: item.iconColor }" />
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
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
  color: var(--text-primary);
}

.header-icon {
  font-size: 28px;
  color: var(--primary-color, #03a9f4);
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.quick-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 24px; // Reduced padding
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-normal);
  height: 100%;
  min-height: 160px; // Further reduced height
  box-shadow: var(--shadow-sm);
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-md);
    border-color: var(--primary-light);

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
  border-radius: var(--radius-md); // Changed to rounded square
  margin-bottom: var(--spacing-lg);
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
  font-size: 18px; // Increased title size
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-desc {
  font-size: 13px; // Reduced font size
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.card-action {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-md);
  font-weight: 600;
  opacity: 0;
  transform: translateX(-10px);
  transition: all var(--transition-normal);
}

.action-arrow {
  font-size: 20px;
}

@media (max-width: 768px) {
  .quick-card {
    margin-bottom: var(--spacing-md);
    min-height: auto;

    .card-action {
      opacity: 1;
      transform: none;
    }
  }
}
</style>
