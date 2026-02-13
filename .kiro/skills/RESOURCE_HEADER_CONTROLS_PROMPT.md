# 资源页面操作栏样式提示词

## 📐 整体布局结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│  页面标题                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  [搜索框] [标签筛选▼] [可见性▼] │ [时间▼] [名称▼] │ [网格][列表] [新建] │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🎨 设计规范

### 整体容器

```
- 布局: Flexbox 横向排列
- 对齐: 左侧搜索筛选，右侧操作按钮
- 间距: 组件间距 12px
- 高度: 所有控件统一 40px
- 字体: 14px, font-weight: 500
```

### 分组规则

1. **左侧区域**: 搜索 + 筛选功能
2. **分隔线**: 右侧边框 + 右边距
3. **中间区域**: 排序按钮组
4. **右侧区域**: 视图切换 + 主操作按钮

---

## 🔍 组件详细规范

### 1. 搜索框 (Search Box)

```
尺寸:
- 宽度: 240px
- 高度: 40px
- 圆角: var(--radius-full) 或 20px (胶囊形)

样式:
- 背景: var(--bg-card) 或 #ffffff
- 边框: 1px solid var(--border-color)
- 内边距: 0 12px 0 40px (左侧留图标位置)

图标:
- 位置: 绝对定位，左侧 12px
- 图标: material-symbols-outlined "search"
- 颜色: var(--text-muted)
- 大小: 16px

交互:
- 聚焦: 边框变为主色，外发光 0 0 0 3px var(--primary-light)
- 占位符: color: var(--text-muted)
```

### 2. 标签筛选 (Tag Filter)

```
按钮样式:
- 高度: 40px
- 内边距: 0 14px
- 圆角: var(--radius-md) 或 12px
- 边框: 1px solid var(--border-color)
- 背景: var(--bg-card)

内容布局:
- Flexbox 横向
- 图标 + 文字 + 箭头
- 间距: gap 6px

图标:
- 左侧: "label" (标签图标)
- 右侧: "expand_more" (下拉箭头)
- 大小: 18px
- 颜色: var(--text-secondary)

下拉菜单:
- 位置: 绝对定位，top: calc(100% + 8px)
- 最小宽度: 200px
- 最大高度: 300px (可滚动)
- 圆角: var(--radius-md)
- 阴影: var(--shadow-lg)
- 背景: var(--bg-card)
- 边框: 1px solid var(--border-color)

选项样式:
- 内边距: 12px 16px
- Flexbox: 复选框 + 文字
- 悬停: background: var(--bg-secondary)
- 选中: background: var(--primary-light)

复选框:
- 尺寸: 20x20px
- 圆角: 4px
- 边框: 2px solid var(--border-color)
- 选中: 背景主色，白色对勾图标
```

### 3. 可见性筛选 (Visibility Filter)

```
按钮样式: (同标签筛选)
- 高度: 40px
- 内边距: 0 14px
- 圆角: var(--radius-md)

动态图标:
- 全部: "visibility" 或 "apps"
- 公开: "public"
- 私有: "lock"

下拉菜单:
- 最小宽度: 140px
- 选项: 图标 + 文字
- 选中状态: 主色背景 + 主色文字

选项布局:
- 内边距: 12px 16px
- 图标大小: 18px
- 文字大小: 14px
```

### 4. 排序按钮组 (Sort Buttons)

```
容器样式:
- Flexbox 横向
- 间距: gap 0
- 右侧: 边框分隔线 + 右边距 12px

单个按钮:
- 高度: 40px
- 内边距: 0 12px
- 圆角: 8px
- 背景: 透明
- 边框: 无

内容布局:
- 图标 + 文字 + 排序箭头
- 间距: gap 6px

图标:
- 时间: "schedule"
- 名称: "sort_by_alpha"
- 大小: 18px

排序箭头:
- 图标: "expand_more"
- 大小: 16px
- 仅激活时显示
- 升序: 旋转 180deg

状态样式:
- 默认: color: var(--text-secondary)
- 悬停: background: var(--bg-tertiary), color: var(--text-primary)
- 激活: background: var(--bg-secondary), color: var(--primary-color)
```

### 5. 视图切换 (View Toggle)

```
容器样式:
- 背景: var(--bg-secondary)
- 圆角: 8px
- 内边距: 3px
- 间距: gap 2px

按钮样式:
- 尺寸: 36x34px
- 圆角: 6px
- 背景: 透明
- 边框: 无

图标:
- 网格: "grid_view"
- 列表: "view_list"
- 大小: 20px
- 颜色: var(--text-secondary)

激活状态:
- 背景: var(--bg-card)
- 颜色: var(--primary-color)
- 阴影: 0 1px 3px rgba(0, 0, 0, 0.1)
- 图标: 填充样式 (FILL: 1)
```

### 6. 主操作按钮 (Primary Action Button)

```
尺寸:
- 高度: 40px
- 内边距: 0 20px
- 圆角: var(--radius-full) 或 20px (胶囊形)

样式:
- 背景: var(--primary-gradient) 或 var(--primary-color)
- 颜色: white
- 阴影: var(--shadow-sm)
- 字重: 500

内容:
- 图标 + 文字
- 间距: gap 8px
- 图标大小: 18px

交互:
- 悬停: 亮度提升 + 阴影加深 + 上移 1px
- 按下: 上移效果取消

常见文案:
- "新建场景"
- "新建实体"
- "上传资源"
```

---

## 🎭 主题适配

### 日间模式 (modern-blue)
```scss
- 背景: #ffffff
- 边框: #e2e8f0
- 文字: #1e293b
- 主色: #00BAFF (可自定义)
- 圆角: 大圆角 (12-20px)
- 阴影: 柔和
```

### 赛博科技 (cyber-tech)
```scss
- 背景: rgba(0, 242, 255, 0.04)
- 边框: rgba(0, 242, 255, 0.15)
- 文字: #E8F4F8
- 主色: #00F2FF
- 效果: 霓虹发光
- 激活: 发光边框 + 外发光
```

### 暖阳橙韵 (edu-friendly)
```scss
- 背景: #FFF8F5
- 边框: #FFE4DB (2px)
- 文字: #2D1810
- 主色: #FF6B35
- 圆角: 超大圆角 (16-20px)
- 动画: 弹性动画 cubic-bezier(0.34, 1.56, 0.64, 1)
```

### 新粗犷主义 (neo-brutalism)
```scss
- 背景: #FFFFFF
- 边框: #000000 (2-3px)
- 文字: #000000
- 主色: #FFF000
- 圆角: 小圆角 (4-8px)
- 阴影: 硬阴影 3px 3px 0px #000000
- 字重: 700 (粗体)
```

### 夜间模式 (deep-space)
```scss
- 背景: #11141B
- 边框: #21262D
- 文字: #E6EDF3
- 主色: #2D68FF
- 效果: 深色背景 + 蓝色高亮
```

### 极简纯净 (minimal-pure)
```scss
- 背景: #ffffff
- 边框: #e0e0e0 (1px)
- 文字: #000000
- 主色: #000000
- 圆角: 0 (无圆角)
- 阴影: none (无阴影)
```

---

## 📱 响应式适配

### 桌面 (>1200px)
```
- 所有控件正常显示
- 搜索框宽度: 240px
```

### 小桌面 (900-1200px)
```
- 搜索框宽度: 200px
- 按钮文字可能隐藏，仅显示图标
```

### 平板 (768-900px)
```
- 控件换行显示
- 搜索框占满第一行
- 其他控件第二行
```

### 移动端 (<768px)
```
- 垂直堆叠
- 搜索框宽度: 100%
- 按钮简化为图标
- 下拉菜单全屏显示
```

---

## 🔄 交互动画

### 下拉菜单动画
```scss
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
```

### 按钮悬停
```scss
transition: all 0.2s ease;

&:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

### 排序箭头旋转
```scss
.sort-arrow {
  transition: transform 0.3s ease;
  
  &.rotated {
    transform: rotate(180deg);
  }
}
```

---

## 💡 使用示例

### Vue 组件结构
```vue
<div class="library-header">
  <div class="title-row">
    <h1 class="library-title">页面标题</h1>
  </div>
  
  <div class="controls-row">
    <div class="header-controls">
      <!-- 搜索框 -->
      <div class="search-box">
        <span class="material-symbols-outlined search-icon">search</span>
        <input class="search-input" placeholder="搜索..." />
      </div>
      
      <!-- 标签筛选 -->
      <div class="tag-filter">
        <button class="tag-filter-btn">
          <span class="material-symbols-outlined">label</span>
          <span>标签筛选</span>
          <span class="material-symbols-outlined arrow">expand_more</span>
        </button>
        <div class="tag-dropdown">
          <!-- 下拉选项 -->
        </div>
      </div>
      
      <!-- 排序按钮 -->
      <div class="sort-buttons">
        <button class="sort-btn" :class="{ active: sortBy === 'time' }">
          <span class="material-symbols-outlined">schedule</span>
          <span>时间</span>
          <span class="material-symbols-outlined sort-arrow">expand_more</span>
        </button>
      </div>
      
      <!-- 视图切换 -->
      <div class="view-toggle">
        <button class="view-btn" :class="{ active: viewMode === 'grid' }">
          <span class="material-symbols-outlined">grid_view</span>
        </button>
        <button class="view-btn" :class="{ active: viewMode === 'list' }">
          <span class="material-symbols-outlined">view_list</span>
        </button>
      </div>
      
      <!-- 主操作按钮 -->
      <button class="upload-btn">
        <span class="material-symbols-outlined">add</span>
        <span>新建</span>
      </button>
    </div>
  </div>
</div>

<div class="header-divider"></div>
```

---

## ⚠️ 注意事项

1. **Z-Index 层级**
   - 页面头部: `z-index: 100`
   - 下拉菜单: `z-index: 1000` 或 `z-index: 9999`
   - 内容区域: `z-index: 1`

2. **下拉菜单定位**
   - 使用绝对定位
   - 父容器设置 `position: relative`
   - 添加 `overflow: hidden` 防止圆角切割

3. **点击外部关闭**
   - 监听 document 点击事件
   - 使用 `closest()` 判断点击区域
   - 在组件卸载时移除监听

4. **图标使用**
   - 统一使用 Google Material Symbols
   - 图标大小: 16-20px
   - 颜色继承父元素或使用语义色

5. **无障碍访问**
   - 按钮添加 `aria-label`
   - 下拉菜单添加 `role="menu"`
   - 支持键盘导航 (Tab, Enter, Escape)

---

**版本**: 1.0.0  
**最后更新**: 2026-02-12  
**适用项目**: AR创作平台及类似资源管理系统
