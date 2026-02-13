<template>
  <div class="theme-switcher">
    <!-- 风格主题选择 -->
    <div class="theme-section">
      <div class="section-header">
        <span class="material-symbols-outlined">palette</span>
        <span class="section-title">界面风格</span>
      </div>
      <div class="theme-list">
        <button
          v-for="theme in availableThemes"
          :key="theme.name"
          class="theme-card"
          :class="{ active: currentThemeName === theme.name }"
          @click="setTheme(theme.name)"
        >
          <div class="theme-preview" :class="theme.name">
            <div class="preview-sidebar"></div>
            <div class="preview-content">
              <div class="preview-header"></div>
              <div class="preview-cards">
                <div class="preview-card"></div>
                <div class="preview-card"></div>
              </div>
            </div>
          </div>
          <div class="theme-info">
            <span class="theme-name">{{ theme.displayName }}</span>
            <span class="theme-desc">{{ theme.description }}</span>
          </div>
          <span 
            v-if="currentThemeName === theme.name" 
            class="material-symbols-outlined check-icon"
          >check_circle</span>
        </button>
      </div>
    </div>
    
    <!-- 日间模式主题色选择 -->
    <div v-if="currentThemeName === 'modern-blue'" class="theme-section">
      <div class="section-header">
        <span class="material-symbols-outlined">colorize</span>
        <span class="section-title">主题色</span>
      </div>
      <div class="color-picker-section">
        <div class="preset-colors">
          <button
            v-for="preset in presetPrimaryColors"
            :key="preset.color"
            class="color-btn"
            :class="{ active: currentPrimaryColor === preset.color }"
            :style="{ '--preset-color': preset.color }"
            :title="preset.name"
            @click="handleColorSelect(preset.color)"
          >
            <span 
              v-if="currentPrimaryColor === preset.color" 
              class="material-symbols-outlined color-check"
            >check</span>
          </button>
        </div>
        <div class="custom-color-row">
          <label class="custom-color-label">
            <span class="material-symbols-outlined">edit</span>
            <span>自定义</span>
            <input 
              type="color" 
              :value="currentPrimaryColor"
              class="color-input"
              @input="handleCustomColor"
            />
          </label>
          <button 
            v-if="customPrimaryColor" 
            class="reset-btn"
            @click="handleResetColor"
          >
            <span class="material-symbols-outlined">restart_alt</span>
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const {
  availableThemes,
  currentThemeName,
  setTheme,
  presetPrimaryColors,
  setCustomPrimaryColor,
  getCustomPrimaryColor,
} = useTheme()

// 当前主题色
const customPrimaryColor = computed(() => getCustomPrimaryColor())
const currentPrimaryColor = computed(() => customPrimaryColor.value || '#00BAFF')

// 选择预设颜色
function handleColorSelect(color: string) {
  if (color === '#00BAFF') {
    setCustomPrimaryColor(null)
  } else {
    setCustomPrimaryColor(color)
  }
}

// 自定义颜色
function handleCustomColor(e: Event) {
  const color = (e.target as HTMLInputElement).value
  setCustomPrimaryColor(color)
}

// 重置为默认
function handleResetColor() {
  setCustomPrimaryColor(null)
}
</script>

<style lang="scss" scoped>
.theme-switcher {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  
  .material-symbols-outlined {
    font-size: 20px;
    color: var(--primary-color, #00BAFF);
  }
  
  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #1e293b);
  }
}

// 风格主题
.theme-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--bg-card, #ffffff);
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 16px);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  
  &:hover {
    border-color: var(--border-color-hover, #94a3b8);
  }
  
  &.active {
    border-color: var(--primary-color, #00BAFF);
    background: var(--primary-light, rgba(0, 186, 255, 0.05));
  }
}

.theme-preview {
  width: 80px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
  
  .preview-sidebar {
    width: 16px;
    background: #1e293b;
  }
  
  .preview-content {
    flex: 1;
    background: #f0f4f8;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  
  .preview-header {
    height: 8px;
    background: #ffffff;
    border-radius: 2px;
  }
  
  .preview-cards {
    flex: 1;
    display: flex;
    gap: 3px;
  }
  
  .preview-card {
    flex: 1;
    background: #ffffff;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }
  
  // 日间模式预览 (modern-blue)
  &.modern-blue {
    .preview-sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; }
    .preview-content { background: #f0f4f8; }
    .preview-card { 
      border-radius: 6px; 
      border-color: #e2e8f0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
  }
  
  // 夜间模式预览 (deep-space)
  &.deep-space {
    .preview-sidebar { 
      background: #080A0F; 
      border-right: 1px solid #21262D;
    }
    .preview-content { 
      background: #0B0E14;
    }
    .preview-header { 
      background: #151921;
      border-radius: 2px;
    }
    .preview-card { 
      background: #151921; 
      border-radius: 4px; 
      border-color: #21262D;
    }
    
    // 蓝色高亮点缀
    &::after {
      content: '';
      position: absolute;
      top: 8px;
      left: 20px;
      width: 4px;
      height: 4px;
      background: #2D68FF;
      border-radius: 50%;
      box-shadow: 0 0 6px #2D68FF;
    }
  }
  
  // 赛博科技预览 - 深色背景、霓虹边框
  &.cyber-tech {
    .preview-sidebar { 
      background: #080A0F; 
      border-right: 1px solid #00F2FF;
      box-shadow: 0 0 8px rgba(0, 242, 255, 0.3);
    }
    .preview-content { 
      background: #0B0E14;
      background-image: 
        linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px);
      background-size: 8px 8px;
    }
    .preview-header { 
      background: rgba(18, 24, 32, 0.85); 
      border-radius: 2px;
    }
    .preview-card { 
      background: rgba(18, 24, 32, 0.85); 
      border-radius: 3px; 
      border-color: rgba(0, 242, 255, 0.2);
      box-shadow: 0 0 4px rgba(0, 242, 255, 0.2);
    }
  }
  
  // 教育友好预览 - 温暖色调、大圆角
  &.edu-friendly {
    .preview-sidebar { 
      background: linear-gradient(180deg, #FF6B35 0%, #FFB347 100%);
    }
    .preview-content { 
      background: #FFF8F5;
    }
    .preview-header { 
      background: #ffffff;
      border-radius: 4px;
    }
    .preview-card { 
      border-radius: 8px; 
      border-color: #FFE4DB;
      border-width: 2px;
    }
    
    // 波浪装饰
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 16px;
      right: 0;
      height: 8px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10'%3E%3Cpath fill='%23FF6B35' fill-opacity='0.15' d='M0,5 Q25,0 50,5 T100,5 L100,10 L0,10 Z'/%3E%3C/svg%3E");
      background-size: cover;
    }
  }
  
  // 新粗犷主义预览 - 粗边框、硬阴影
  &.neo-brutalism {
    border-radius: 4px;
    .preview-sidebar { 
      background: #FFFFFF;
      border-right: 2px solid #000000;
    }
    .preview-content { 
      background: #FAFAF8;
    }
    .preview-header { 
      background: #FFF000;
      border-radius: 2px;
      border: 1px solid #000000;
    }
    .preview-card { 
      border-radius: 2px; 
      border: 2px solid #000000;
      box-shadow: 2px 2px 0 #000000;
    }
  }
  
  // 极简纯净预览 - 无圆角、纯黑白
  &.minimal-pure {
    border-radius: 0;
    .preview-sidebar { 
      background: #fafafa;
      border-right: 1px solid #e0e0e0;
    }
    .preview-content { 
      background: #ffffff;
    }
    .preview-header { 
      background: #fafafa;
      border-radius: 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .preview-card { 
      border-radius: 0; 
      border-color: #e0e0e0;
      box-shadow: none;
    }
  }
}

.theme-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.theme-desc {
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  font-size: 24px;
  color: var(--primary-color, #00BAFF);
  flex-shrink: 0;
}

// 响应式
@media (max-width: 640px) {
  .theme-desc {
    display: none;
  }
  
  .theme-preview {
    width: 60px;
    height: 42px;
  }
}

// 主题色选择器
.color-picker-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--preset-color);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &.active {
    border-color: var(--text-primary, #1e293b);
    box-shadow: 0 0 0 2px var(--bg-card, #ffffff), 0 0 0 4px var(--preset-color);
  }
  
  .color-check {
    font-size: 18px;
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

.custom-color-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-color-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--border-color-hover, #94a3b8);
    color: var(--text-primary, #1e293b);
  }
  
  .material-symbols-outlined {
    font-size: 16px;
  }
  
  .color-input {
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    background: transparent;
    
    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    
    &::-webkit-color-swatch {
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 50%;
    }
  }
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-full, 9999px);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--danger-color, #ef4444);
    color: var(--danger-color, #ef4444);
    background: var(--danger-light, rgba(239, 68, 68, 0.1));
  }
  
  .material-symbols-outlined {
    font-size: 16px;
  }
}
</style>
