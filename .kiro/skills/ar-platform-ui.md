# AR创作平台 UI 设计系统 - Agent Skills

本技能文档包含 AR 创作平台的完整 UI 设计系统规范，可帮助其他项目快速理解并复用这套 UI 布局和样式设计。

## 📋 目录

1. [项目概述](#项目概述)
2. [主题系统](#主题系统)
3. [CSS 变量系统](#css-变量系统)
4. [核心组件规范](#核心组件规范)
5. [页面布局规范](#页面布局规范)
6. [列表视图规范](#列表视图规范)
7. [主题适配指南](#主题适配指南)
8. [文件结构](#文件结构)
9. [开发规范](#开发规范)

---

## 项目概述

基于 **Vue 3 + TypeScript + Element Plus + SCSS** 的前端项目，支持完整的多主题风格切换系统。

### 技术栈
- Vue 3 Composition API
- TypeScript
- Element Plus
- SCSS + CSS Variables
- Google Material Symbols 图标

---

## 主题系统

### 可用主题（6套）

| 主题ID | 名称 | 风格特点 | 适用场景 |
|--------|------|----------|----------|
| `modern-blue` | 日间模式 | 大圆角、柔和阴影、支持自定义主题色 | 通用场景，默认主题 |
| `deep-space` | 夜间模式 | 深空暗黑、电光蓝点缀 #2D68FF | 夜间使用、专业开发 |
| `cyber-tech` | 赛博科技 | 锐利边角、霓虹发光 #00F2FF | 科技感、游戏类应用 |
| `edu-friendly` | 暖阳橙韵 | 超大圆角、温暖橙色 #FF6B35 | 温暖活泼、创意类应用 |
| `neo-brutalism` | 新粗犷主义 | 粗边框、硬阴影、混搭色 | 潮流艺术、年轻创作者 |
| `minimal-pure` | 极简纯净 | 无圆角、无阴影、黑白 | 专注内容、极简风格 |

### 主题特殊颜色参考

| 主题 | 主色 | 强调色 | 背景色 | 文字色 |
|------|------|--------|--------|--------|
| modern-blue | #00BAFF | 可自定义 | #f0f4f8 | #1e293b |
| cyber-tech | #00F2FF | #FF3366 | #0B0E14 | #E8F4FF |
| edu-friendly | #FF6B35 | #FFB347 | #FFF8F5 | #2D1810 |
| neo-brutalism | #FFF000 | #FF007A, #00FFC2 | #FAFAF8 | #000000 |
| deep-space | #2D68FF | #00D4AA | #0B0E14 | #E6EDF3 |
| minimal-pure | #000000 | - | #FFFFFF | #000000 |

### 日间模式自定义主题色

日间模式支持自定义主题色，提供 10 种预设颜色：

```typescript
const presetPrimaryColors = [
  { name: '科技蓝', value: '#00BAFF' },  // 默认
  { name: '活力橙', value: '#FF6B35' },
  { name: '自然绿', value: '#10B981' },
  { name: '优雅紫', value: '#8B5CF6' },
  { name: '玫瑰粉', value: '#F43F5E' },
  { name: '天空蓝', value: '#0EA5E9' },
  { name: '琥珀黄', value: '#F59E0B' },
  { name: '靛蓝', value: '#6366F1' },
  { name: '青色', value: '#14B8A6' },
  { name: '石板灰', value: '#64748B' }
]
```

### 主题切换 API

```typescript
import { useTheme } from '@/composables/useTheme'

const { 
  currentThemeName,       // 当前主题ID
  isDarkTheme,            // 当前主题是否为深色
  currentColors,          // 当前颜色配置
  currentStyle,           // 当前风格配置
  availableThemes,        // 所有可用主题
  presetPrimaryColors,    // 预设主题色列表
  setTheme,               // 切换主题
  setCustomPrimaryColor,  // 设置自定义主题色（仅日间模式）
  getCustomPrimaryColor,  // 获取当前自定义主题色
  initTheme               // 初始化主题
} = useTheme()

// 切换主题
setTheme('cyber-tech')

// 自定义日间模式主题色
setTheme('modern-blue')
setCustomPrimaryColor('#FF6B35')  // 设置为活力橙
setCustomPrimaryColor(null)       // 重置为默认
```

### 主题切换组件

```vue
<template>
  <ThemeSwitcher />
</template>

<script setup>
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
</script>
```

---

## CSS 变量系统

### 颜色变量

```scss
// 主色调
--primary-color: #00BAFF;
--primary-hover: #0099DD;
--primary-light: rgba(0, 186, 255, 0.1);
--primary-dark: #0077AA;
--primary-gradient: linear-gradient(135deg, #00BAFF 0%, #0099DD 100%);
--shadow-primary: 0 4px 12px rgba(0, 186, 255, 0.25);

// 文字颜色
--text-primary: #1e293b;
--text-secondary: #64748b;
--text-muted: #94a3b8;
--text-inverse: #ffffff;

// 背景颜色
--bg-page: #f0f4f8;
--bg-card: #ffffff;
--bg-hover: #f8fafc;
--bg-active: #e2e8f0;
--bg-secondary: #f1f5f9;
--bg-tertiary: #e2e8f0;

// 边框颜色
--border-color: #e2e8f0;
--border-color-hover: #94a3b8;
--border-color-active: #00BAFF;

// 语义色
--success-color: #22c55e;
--success-light: rgba(34, 197, 94, 0.1);
--warning-color: #f59e0b;
--warning-light: rgba(245, 158, 11, 0.1);
--danger-color: #ef4444;
--danger-light: rgba(239, 68, 68, 0.1);
--info-color: #00BAFF;
--info-light: rgba(0, 186, 255, 0.1);
```

### 风格变量

```scss
// 圆角
--radius-sm: 12px;     // 按钮、输入框
--radius-md: 20px;     // 卡片
--radius-lg: 24px;     // 对话框
--radius-full: 9999px; // 胶囊按钮

// 阴影
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

// 间距
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

// 字体
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-size-xs: 12px;
--font-size-sm: 13px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 18px;

// 动画
--transition-fast: 0.15s ease;
--transition-normal: 0.2s ease;
--transition-slow: 0.3s ease;

// 边框
--border-width: 1px;
```

---

## 核心组件规范

### 1. 按钮组件

**规格**: 高度 44px，胶囊形圆角

```scss
// 主按钮
.btn-primary {
  height: 44px;
  padding: 0 28px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary-gradient);
  color: var(--text-inverse);
  font-size: var(--font-size-md);
  font-weight: 500;
  box-shadow: var(--shadow-primary);
  
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
}

// 次要按钮
.btn-secondary {
  height: 44px;
  padding: 0 28px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--bg-card);
  color: var(--text-secondary);
  
  &:hover {
    border-color: var(--border-color-hover);
    color: var(--text-primary);
  }
}

// 危险按钮
.btn-danger {
  background: var(--danger-color);
  color: var(--text-inverse);
}
```

### 2. 卡片组件

**规格**: 圆角 24px，内边距 32px

```scss
.settings-card {
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
}
```

### 3. 对话框组件

**重要**: 使用 `ConfirmDialog` 组件，禁止使用 `ElMessageBox`

```vue
<ConfirmDialog
  v-model="showDialog"
  title="删除确认"
  message="确定要删除这个场景吗？"
  description="此操作不可撤销"
  type="danger"
  confirm-text="确定"
  cancel-text="取消"
  @confirm="handleConfirm"
  @cancel="handleCancel"
/>

<InputDialog
  v-model="showInput"
  title="新建场景"
  label="场景名称"
  placeholder="请输入场景名称"
  :default-value="defaultName"
  confirm-text="创建"
  @confirm="handleCreate"
/>
```

### 4. 输入框组件

**规格**: 高度 44px，圆角 12px

```scss
:deep(.el-input__wrapper) {
  border-radius: var(--radius-sm);
  box-shadow: none !important;
  border: var(--border-width) solid var(--border-color) !important;
  background: var(--bg-card);
  
  &:focus-within {
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 0 3px var(--primary-light) !important;
  }
}
```

### 5. 搜索框组件

**规格**: 高度 44px，胶囊形

```scss
.search-input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 48px;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--bg-card);
  
  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
}
```

### 6. 下拉菜单组件

**规格**: 圆角 20px，内边距 6px

```scss
.dropdown-menu {
  padding: 6px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--shadow-lg);
}

.dropdown-item {
  padding: 12px 16px;
  border-radius: calc(var(--radius-md) - 6px);
  
  &:hover {
    background: var(--bg-hover);
  }
  
  &.danger {
    color: var(--danger-color);
    
    &:hover {
      background: var(--danger-light);
    }
  }
}
```

### 7. 空状态组件

**用途**: 列表/网格无数据时的占位显示

```vue
<EmptyState
  icon="folder_open"
  text="暂无场景"
  action-text="创建第一个场景"
  @action="handleCreate"
/>
```

```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 20px;
  
  .empty-icon {
    font-size: 72px;
    color: var(--text-muted);
  }
  
  .empty-action {
    border: 2px dashed var(--primary-color);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--primary-color);
  }
}
```

### 8. 标准卡片组件

**用途**: 网格视图下资源、实体、场景的统一卡片展示

**结构**: 三区域布局 - 封面区（16:10）、内容区、操作区

```vue
<StandardCard
  :image="item.image?.url"
  :title="item.title"
  :description="item.description"
  :tags="['标签1', '标签2']"
  :meta="{ author: '作者', date: '日期' }"
  action-text="进入编辑"
  action-icon="edit"
  placeholder-icon="category"
  :selected="isSelected"
  :selection-mode="hasSelection"
  @view="handleView"
  @action="handleAction"
  @select="handleSelect"
/>
```

**交互特性**:
- 封面悬停：半透明覆盖层 + "查看信息"提示 + 图片 scale(1.05)
- 渐进式复选框：默认隐藏，悬停/选中时显示
- 分离点击目标：封面→view，复选框→select，底部→action
- 标签徽章：封面左下角，最多显示 2 个

```scss
.standard-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  
  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }
  
  .card-thumbnail {
    aspect-ratio: 16 / 10;
  }
  
  .thumbnail-overlay {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }
  
  .card-action {
    background: var(--bg-hover);
    border-top: var(--border-width) solid var(--border-color);
  }
}
```

---

## 页面布局规范

### 整体布局结构

```
┌─────────────────────────────────────────────────┐
│                   NavBar (64px)                  │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │           Main Content               │
│ (260px)  │                                       │
│          │                                       │
├──────────┴──────────────────────────────────────┤
│                   Footer (56px)                  │
└─────────────────────────────────────────────────┘
```

### 侧边栏规格

- 展开宽度: 260px
- 折叠宽度: 72px
- 菜单项圆角: 20px
- 激活项: 主色背景 + 白色文字

### 顶部导航栏规格

- 高度: 64px
- 毛玻璃效果: `backdrop-filter: blur(12px)`
- 半透明背景: `rgba(255, 255, 255, 0.7)`

### 资源库页面布局

```vue
<div class="resource-library">
  <!-- 页面头部 -->
  <div class="library-header">
    <div class="title-row">
      <h1 class="library-title">页面标题</h1>
    </div>
    <div class="controls-row">
      <div class="header-controls">
        <!-- 搜索框、筛选、排序、视图切换、操作按钮 -->
      </div>
    </div>
  </div>
  
  <!-- 分割线 -->
  <div class="header-divider"></div>
  
  <!-- 内容区域 -->
  <div class="library-content">
    <!-- 网格视图 / 列表视图 / 空状态 / 加载状态 -->
  </div>
  
  <!-- 分页 -->
  <div class="pagination-wrapper">
    <!-- 分页控件 -->
  </div>
</div>
```

---

## 列表视图规范

### 统一列表结构

```vue
<div class="resource-list">
  <table class="list-table">
    <thead>
      <tr>
        <th class="col-edit-action"></th>
        <th class="col-name">名称</th>
        <th class="col-author">作者</th>
        <th class="col-created_at">修改日期</th>
        <th class="col-actions">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr class="list-row" v-for="item in items">
        <td class="col-edit-action">
          <button class="enter-editor-btn">进入编辑</button>
        </td>
        <td class="col-name">
          <div class="name-cell">
            <div class="row-thumbnail">
              <img :src="item.image" />
            </div>
            <span class="file-name">{{ item.name }}</span>
          </div>
        </td>
        <td class="col-author">{{ item.author }}</td>
        <td class="col-created_at">{{ item.date }}</td>
        <td class="col-actions">
          <div class="more-actions">
            <button class="more-btn">
              <span class="material-symbols-outlined">more_horiz</span>
            </button>
            <div class="row-menu">
              <div class="menu-item">修改信息</div>
              <div class="menu-item">下载</div>
              <div class="menu-item danger">删除</div>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### 统一列宽规格

```scss
.col-edit-action { width: 100px; }
.col-name { min-width: 200px; }
.col-entities { width: 100px; text-align: center; }
.col-tags { width: 160px; }
.col-visibility { width: 100px; }
.col-author { width: 120px; }
.col-created_at { width: 130px; }
.col-actions { width: 70px; text-align: right; }
```

### 列表样式

```scss
.resource-list {
  background: var(--bg-card);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  
  .list-table th {
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    padding: 14px 16px;
    border-bottom: var(--border-width) solid var(--border-color);
  }
  
  .list-row {
    cursor: pointer;
    transition: background var(--transition-fast);
    
    &:hover {
      background: var(--bg-hover);
      
      .enter-editor-btn {
        opacity: 1;
      }
    }
    
    td {
      padding: 14px 16px;
      border-bottom: var(--border-width) solid var(--border-color);
    }
  }
  
  .row-thumbnail {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    overflow: hidden;
  }
  
  .enter-editor-btn {
    height: 34px;
    padding: 0 16px;
    border-radius: var(--radius-sm);
    background: var(--primary-color);
    color: var(--text-inverse);
    opacity: 0;
    transition: opacity var(--transition-fast);
  }
}
```

---

## 主题适配指南

### 添加新组件的主题样式

在 `src/styles/themes/theme-styles.scss` 中为每个主题添加样式：

```scss
// 1. 日间模式 - 使用 CSS 变量
.theme-modern-blue {
  .my-component {
    background: var(--bg-card);
    border: var(--border-width) solid var(--border-color);
    border-radius: var(--radius-lg);
  }
}

// 2. 赛博科技 - 霓虹发光效果
.theme-cyber-tech {
  .my-component {
    background: rgba(0, 242, 255, 0.1) !important;
    border: 1px solid rgba(0, 242, 255, 0.3) !important;
    box-shadow: 0 0 20px rgba(0, 242, 255, 0.2) !important;
    backdrop-filter: blur(20px) !important;
  }
}

// 3. 暖阳橙韵 - 温暖渐变 + 弹性动画
.theme-edu-friendly {
  .my-component {
    background: linear-gradient(135deg, #FFF8F5 0%, #FFE8DD 100%) !important;
    border: 2px solid #FFE4DB !important;
    border-radius: 20px !important;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    
    &:hover {
      transform: translateY(-4px) scale(1.02) !important;
    }
  }
}

// 4. 新粗犷主义 - 粗边框 + 硬阴影
.theme-neo-brutalism {
  .my-component {
    background: #FFFFFF !important;
    border: 3px solid #000000 !important;
    border-radius: 8px !important;
    box-shadow: 5px 5px 0px #000000 !important;
    
    &:hover {
      transform: translate(-3px, -3px) !important;
      box-shadow: 8px 8px 0px #000000 !important;
    }
  }
}

// 5. 夜间模式 - 深色背景 + 蓝色高亮
.theme-deep-space {
  .my-component {
    background: #151921 !important;
    border: 1px solid #21262D !important;
    
    &:hover {
      border-color: #2D68FF !important;
      box-shadow: 0 0 20px rgba(45, 104, 255, 0.2) !important;
    }
  }
}

// 6. 极简纯净 - 无圆角无阴影
.theme-minimal-pure {
  .my-component {
    background: #ffffff !important;
    border: 1px solid #e0e0e0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}
```

### 主题类名格式

- `.theme-modern-blue`
- `.theme-deep-space`
- `.theme-cyber-tech`
- `.theme-edu-friendly`
- `.theme-neo-brutalism`
- `.theme-minimal-pure`

---

## 文件结构

```
src/
├── composables/
│   └── useTheme.ts                    # 主题切换 composable
├── components/
│   ├── Dialog/
│   │   ├── ConfirmDialog.vue          # 确认对话框
│   │   └── InputDialog.vue            # 输入对话框
│   ├── ThemeSwitcher/
│   │   └── ThemeSwitcher.vue          # 主题切换组件
│   ├── ResourceLibrary/
│   │   ├── ResourceLibrary.vue        # 资源库主组件
│   │   ├── ResourceHeader.vue         # 资源库头部
│   │   ├── ResourceGrid.vue           # 网格视图
│   │   ├── ResourceList.vue           # 列表视图
│   │   └── ResourceDetailPanel.vue    # 详情面板
│   ├── Meta/
│   │   └── MetaDetailPanel.vue        # 实体详情面板
│   └── Verse/
│       ├── VerseDetailPanel.vue       # 场景详情面板
│       └── VersePublicLibrary.vue     # 公开场景库
├── layout/components/
│   ├── Sidebar/SidebarNew.vue         # 侧边栏
│   ├── NavBar/                        # 导航栏
│   └── Footer/Footer.vue              # 底部信息栏
├── views/
│   ├── meta/MetaLibrary.vue           # 实体库页面
│   ├── verse/VerseLibrary.vue         # 场景库页面
│   ├── polygen/ModelLibrary.vue       # 模型库页面
│   ├── audio/AudioLibrary.vue         # 音频库页面
│   ├── picture/PictureLibrary.vue     # 图片库页面
│   ├── video/VideoLibrary.vue         # 视频库页面
│   ├── help/HelpCenter.vue            # 帮助中心
│   └── settings/                      # 设置页面
└── styles/themes/
    ├── index.ts                       # 主题定义 + 颜色生成
    ├── variables.scss                 # CSS 变量定义
    └── theme-styles.scss              # 主题特殊样式 (~8500行)
```

---

## 开发规范

### 必须遵守

1. **使用 CSS 变量** - 所有颜色、间距、圆角都使用 CSS 变量
2. **避免硬编码颜色** - 不要直接写 `#00BAFF`，使用 `var(--primary-color)`
3. **使用 ConfirmDialog** - 禁止使用 `ElMessageBox`
4. **按钮使用胶囊形** - `border-radius: var(--radius-full)`
5. **主题类名格式** - `.theme-{theme-id}`
6. **侧边栏文字类名** - 使用 `.item-text` 而非 `.sidebar-text`

### Z-Index 层级规范

```scss
.navbar { z-index: 100; }
.sidebar { z-index: 90; }
.library-header { z-index: 100; }
.dropdown-menu { z-index: 1000; }
.detail-panel { z-index: 1000; }
.modal-overlay { z-index: 2000; }
```

### 响应式断点

```scss
$breakpoint-sm: 640px;   // 移动端
$breakpoint-md: 768px;   // 平板
$breakpoint-lg: 900px;   // 小桌面
$breakpoint-xl: 1200px;  // 大桌面
```

### 图标系统

使用 Google Material Symbols：

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
<span class="material-symbols-outlined">icon_name</span>
```

常用图标：
- 导航: `home`, `category`, `token`, `layers`, `help`, `settings`, `logout`
- 操作: `search`, `add`, `edit`, `delete`, `download`, `upload`
- 状态: `visibility`, `lock`, `public`, `label`
- 其他: `expand_more`, `more_horiz`, `close`, `check`

---

## 快速复用指南

### 1. 复制核心文件

```bash
# 主题系统
src/styles/themes/
src/composables/useTheme.ts
src/components/ThemeSwitcher/

# 对话框组件
src/components/Dialog/

# 布局组件
src/layout/components/Sidebar/
src/layout/components/NavBar/
src/layout/components/Footer/
```

### 2. 安装依赖

```bash
npm install element-plus sass
```

### 3. 引入图标

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```

### 4. 初始化主题

```typescript
// main.ts
import { useTheme } from '@/composables/useTheme'

const { initTheme } = useTheme()
initTheme()
```

---

**版本**: 2.0.0  
**最后更新**: 2026-02-12  
**维护者**: Mixed Reality Programming Platform Team
