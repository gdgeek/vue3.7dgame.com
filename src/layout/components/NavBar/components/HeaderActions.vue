<template>
  <div class="header-actions">
    <!-- Icon button group -->
    <div class="actions-group">
      <button class="icon-btn" @click="toggleFullscreen" title="全屏">
        <span class="material-symbols-outlined">
          {{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}
        </span>
      </button>

      <!-- 主题切换下拉菜单 -->
      <el-dropdown @command="handleThemeChange" trigger="click" class="theme-dropdown">
        <button class="icon-btn" title="切换主题">
          <span class="material-symbols-outlined">palette</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu class="theme-menu">
            <el-dropdown-item v-for="theme in availableThemes" :key="theme.name" :command="theme.name"
              :class="{ 'is-active': currentThemeName === theme.name }">
              <div class="theme-item">
                <div class="theme-preview-mini" :class="theme.name"></div>
                <div class="theme-info">
                  <span class="theme-name">{{ theme.displayName }}</span>
                  <span class="theme-desc">{{ theme.description }}</span>
                </div>
                <span v-if="currentThemeName === theme.name" class="theme-check">
                  <span class="material-symbols-outlined">check</span>
                </span>
              </div>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown @command="handleLanguageChange" trigger="click" class="language-dropdown">
        <button class="icon-btn" title="语言">
          <span class="material-symbols-outlined">language</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu class="language-menu">
            <el-dropdown-item v-for="lang in languages" :key="lang.value" :command="lang.value"
              :class="{ 'is-active': currentLocale === lang.value }">
              <div class="language-item">
                <span class="language-name">{{ lang.label }}</span>
                <span v-if="currentLocale === lang.value" class="language-check">
                  <span class="material-symbols-outlined">check</span>
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from '@/composables/useTheme';
import { useFullscreen } from '@vueuse/core';

const { locale } = useI18n();
const { availableThemes, currentThemeName, setTheme } = useTheme();
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

const currentLocale = computed(() => locale.value);

const languages = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'th-TH', label: 'ภาษาไทย' },
];

const handleThemeChange = (themeName: string) => {
  setTheme(themeName);
};

const handleLanguageChange = async (lang: string) => {
  const { loadLanguageAsync } = await import('@/lang');
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
  align-items: center;
  gap: 4px;
  padding-right: 16px;
  border-right: 1px solid var(--ar-divider);
}

// 主题下拉菜单
.theme-dropdown {
  :deep(.el-dropdown-menu) {
    min-width: 280px;
    padding: 8px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color);
    background: var(--bg-card);
  }

  :deep(.el-dropdown-menu__item) {
    padding: 0;
    border-radius: 12px;
    margin-bottom: 6px;
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
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  width: 100%;
}

.theme-preview-mini {
  width: 40px;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  position: relative;

  // 日间模式
  &.modern-blue {
    background: linear-gradient(90deg, #ffffff 30%, #f0f4f8 30%);

    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      background: #ffffff;
      border-radius: 2px;
      border: 1px solid #e2e8f0;
    }
  }

  // 夜间模式
  &.deep-space {
    background: linear-gradient(90deg, #080A0F 30%, #0B0E14 30%);

    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      background: #151921;
      border-radius: 2px;
      border: 1px solid #21262D;
    }

    &::before {
      content: '';
      position: absolute;
      top: 6px;
      left: 4px;
      width: 3px;
      height: 3px;
      background: #2D68FF;
      border-radius: 50%;
    }
  }

  // 赛博科技
  &.cyber-tech {
    background: linear-gradient(90deg, #080A0F 30%, #0B0E14 30%);
    border-color: rgba(0, 242, 255, 0.3);

    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      background: rgba(18, 24, 32, 0.85);
      border-radius: 2px;
      border: 1px solid rgba(0, 242, 255, 0.2);
      box-shadow: 0 0 4px rgba(0, 242, 255, 0.3);
    }
  }

  // 教育友好
  &.edu-friendly {
    background: linear-gradient(90deg, linear-gradient(180deg, #FF6B35, #FFB347) 30%, #FFF8F5 30%);
    background: #FFF8F5;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 30%;
      background: linear-gradient(180deg, #FF6B35, #FFB347);
    }

    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      background: #ffffff;
      border-radius: 4px;
      border: 2px solid #FFE4DB;
    }
  }

  // 新粗犷主义
  &.neo-brutalism {
    background: #FAFAF8;
    border: 2px solid #000000;
    border-radius: 2px;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 30%;
      background: #FFFFFF;
      border-right: 2px solid #000000;
    }

    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 6px;
      background: #FFF000;
      border: 1px solid #000000;
      box-shadow: 2px 2px 0 #000000;
    }
  }

  // 极简纯净
  &.minimal-pure {
    background: #ffffff;
    border-radius: 0;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 30%;
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
    }

    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 8px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
    }
  }
}

.theme-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.theme-desc {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-check {
  display: flex;
  align-items: center;
  color: var(--primary-color);
  flex-shrink: 0;

  .material-symbols-outlined {
    font-size: 18px;
    font-weight: 600;
  }
}

// 语言下拉菜单
.language-dropdown {
  :deep(.el-dropdown-menu) {
    min-width: 200px;
    padding: 8px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border: 1px solid var(--border-color);
    background: var(--bg-card);
  }

  :deep(.el-dropdown-menu__item) {
    padding: 0;
    border-radius: 8px;
    margin-bottom: 4px;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  width: 100%;
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

  .material-symbols-outlined {
    font-size: 18px;
    font-weight: 600;
  }
}
</style>
