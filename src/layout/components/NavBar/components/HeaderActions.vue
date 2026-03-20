<template>
  <div class="header-actions">
    <!-- Icon button group -->
    <div class="actions-group">
      <button
        class="icon-btn"
        @click="toggleFullscreen"
        :title="t('ui.fullscreen')"
      >
        <font-awesome-icon
          :icon="['fas', isFullscreen ? 'compress' : 'expand']"
        ></font-awesome-icon>
      </button>

      <!-- 主题切换下拉菜单 -->
      <el-dropdown
        v-if="!domainStore.isStyleLocked"
        @command="handleThemeChange"
        trigger="click"
        class="theme-dropdown"
      >
        <button class="icon-btn" :title="t('ui.switchTheme')">
          <font-awesome-icon :icon="['fas', 'palette']"></font-awesome-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu class="theme-menu">
            <el-dropdown-item
              v-for="theme in availableThemes"
              :key="theme.name"
              :command="theme.name"
              :class="{ 'is-active': currentThemeName === theme.name }"
            >
              <div class="theme-item">
                <div class="theme-preview-mini" :class="theme.name"></div>
                <div class="theme-info">
                  <span class="theme-name">{{ theme.displayName }}</span>
                  <span class="theme-desc">{{ theme.description }}</span>
                </div>
                <span
                  v-if="currentThemeName === theme.name"
                  class="theme-check"
                >
                  <font-awesome-icon
                    :icon="['fas', 'check']"
                  ></font-awesome-icon>
                </span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown
        v-if="!domainStore.isLanguageLocked"
        @command="handleLanguageChange"
        trigger="click"
        class="language-dropdown"
      >
        <button class="icon-btn" :title="t('ui.language')">
          <font-awesome-icon :icon="['fas', 'language']"></font-awesome-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu class="language-menu">
            <el-dropdown-item
              v-for="lang in languages"
              :key="lang.value"
              :command="lang.value"
              :class="{ 'is-active': currentLocale === lang.value }"
            >
              <div class="language-item">
                <span class="language-name">{{ lang.label }}</span>
                <span
                  v-if="currentLocale === lang.value"
                  class="language-check"
                >
                  <font-awesome-icon
                    :icon="['fas', 'check']"
                  ></font-awesome-icon>
                </span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { useFullscreen } from "@vueuse/core";
import { useDomainStore } from "@/store/modules/domain";

const { locale, t } = useI18n();
const { availableThemes, currentThemeName, setTheme } = useTheme();
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
const domainStore = useDomainStore();

const currentLocale = computed(() => locale.value);

const languages = [
  { value: "en-US", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "ja-JP", label: "日本語" },
  { value: "th-TH", label: "ภาษาไทย" },
];

const handleThemeChange = (themeName: string) => {
  setTheme(themeName);
};

const handleLanguageChange = async (lang: string) => {
  const { loadLanguageAsync } = await import("@/lang");
  await loadLanguageAsync(lang);
};
</script>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  align-items: center;
}

.actions-group {
  display: flex;
  gap: 4px;
  align-items: center;
  padding-right: 16px;
  border-right: 1px solid var(--ar-divider);
}

// 主题下拉菜单
.theme-dropdown {
  :deep(.el-dropdown-menu) {
    min-width: 280px;
    padding: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgb(0 0 0 / 15%);
  }

  :deep(.el-dropdown-menu__item) {
    padding: 0;
    margin-bottom: 6px;
    border-radius: 12px;
    transition: all 0.2s ease;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background-color: var(--bg-hover);
    }

    &.is-active {
      background-color: var(--primary-light);

      .theme-name {
        color: var(--primary-color);
      }
    }
  }
}

.theme-item {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
}

.theme-preview-mini {
  position: relative;
  display: flex;
  flex-shrink: 0;
  width: 40px;
  height: 28px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 6px;

  // 日间模式
  &.modern-blue {
    background: linear-gradient(90deg, #fff 30%, #f0f4f8 30%);

    &::after {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      content: "";
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 2px;
    }
  }

  // 夜间模式
  &.deep-space {
    background: linear-gradient(90deg, #080a0f 30%, #0b0e14 30%);

    &::after {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      content: "";
      background: #151921;
      border: 1px solid #21262d;
      border-radius: 2px;
    }

    &::before {
      position: absolute;
      top: 6px;
      left: 4px;
      width: 3px;
      height: 3px;
      content: "";
      background: #2d68ff;
      border-radius: 50%;
    }
  }

  // 赛博科技
  &.cyber-tech {
    background: linear-gradient(90deg, #080a0f 30%, #0b0e14 30%);
    border-color: rgb(0 242 255 / 30%);

    &::after {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      content: "";
      background: rgb(18 24 32 / 85%);
      border: 1px solid rgb(0 242 255 / 20%);
      border-radius: 2px;
      box-shadow: 0 0 4px rgb(0 242 255 / 30%);
    }
  }

  // 教育友好
  &.edu-friendly {
    background: #fff8f5;

    &::before {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 30%;
      content: "";
      background: linear-gradient(180deg, #ff6b35, #ffb347);
    }

    &::after {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      content: "";
      background: #fff;
      border: 2px solid #ffe4db;
      border-radius: 4px;
    }
  }

  // 新粗犷主义
  &.neo-brutalism {
    background: #fafaf8;
    border: 2px solid #000;
    border-radius: 2px;

    &::before {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 30%;
      content: "";
      background: #fff;
      border-right: 2px solid #000;
    }

    &::after {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 6px;
      content: "";
      background: #fff000;
      border: 1px solid #000;
      box-shadow: 2px 2px 0 #000;
    }
  }

  // 极简纯净
  &.minimal-pure {
    background: #fff;
    border-radius: 0;

    &::before {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 30%;
      content: "";
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
    }

    &::after {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      content: "";
      background: #fff;
      border: 1px solid #e0e0e0;
    }
  }
}

.theme-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.theme-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.theme-desc {
  overflow: hidden;
  font-size: 12px;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-check {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--primary-color);

  .svg-inline--fa {
    font-size: 14px;
  }
}

// 语言下拉菜单
.language-dropdown {
  :deep(.el-dropdown-menu) {
    min-width: 200px;
    padding: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  }

  :deep(.el-dropdown-menu__item) {
    padding: 0;
    margin-bottom: 4px;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background-color: var(--bg-hover);
    }

    &.is-active {
      background-color: var(--primary-light);

      .language-item {
        color: var(--primary-color);
      }
    }
  }
}

.language-item {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  color: var(--text-primary);
  transition: color 0.2s ease;
}

.language-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.language-check {
  display: flex;
  align-items: center;
  color: var(--primary-color);

  .svg-inline--fa {
    font-size: 14px;
  }
}
</style>
