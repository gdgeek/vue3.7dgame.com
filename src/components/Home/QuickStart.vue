<template>
  <div class="quick-start-section">
    <div class="section-header">
      <span class="material-symbols-outlined header-icon">bolt</span>
      <h2 class="section-title">{{ t("homepage.quickStart.title", "快速开始") }}</h2>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="8" v-for="(item, index) in quickItems" :key="index">
        <div class="quick-card" @click="handleQuickAction(item.action)">
          <div class="card-icon-wrapper" :style="{ backgroundColor: item.bgColor }">
            <span class="material-symbols-outlined card-icon" :style="{ color: item.iconColor }">{{ item.icon }}</span>
          </div>
          <div class="card-content">
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-desc">{{ item.desc }}</p>
          </div>
          <div class="card-action">
            <span class="action-text" :style="{ color: item.iconColor }">立即{{ item.title.slice(0, 2) }}</span>
            <span class="material-symbols-outlined action-arrow" :style="{ color: item.iconColor }">arrow_forward</span>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

const quickItems = [
  {
    title: t("homepage.quickStart.upload.title", "上传素材"),
    desc: t("homepage.quickStart.upload.desc", "导入 3D 模型或多媒体文件到您的个人库中。"),
    icon: "cloud_upload",
    bgColor: "var(--primary-light)", // Use theme var
    iconColor: "var(--primary-color)", // Use theme var
    action: "/resource/polygen/index"
  },
  {
    title: t("homepage.quickStart.edit.title", "编辑实体"),
    desc: t("homepage.quickStart.edit.desc", "管理交互式组件和行为脚本，赋予 AR 资产生命力。"),
    icon: "edit_square",
    bgColor: "var(--primary-light)", // Use theme var
    iconColor: "var(--primary-color)", // Use theme var
    action: "/meta/list"
  },
  {
    title: t("homepage.quickStart.create.title", "创建场景"),
    desc: t("homepage.quickStart.create.desc", "从零开始构建一个全新的沉浸式 AR 互动体验。"),
    icon: "add_box",
    bgColor: "var(--primary-light)", // Use theme var
    iconColor: "var(--primary-color)", // Use theme var
    action: "/verse/index"
  }
];

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
