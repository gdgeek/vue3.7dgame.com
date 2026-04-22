# 统一插件设计指南

## 概述

本指南为混合现实编程教育平台的所有插件提供统一的视觉设计标准。涵盖颜色系统、排版、间距、组件样式、主题适配等内容，确保所有插件与主系统保持一致的设计语言。

---

## 1. 颜色系统

### 1.1 主色调体系

主系统支持 6 种独立主题，每个主题都有完整的颜色配置。插件应该使用 CSS 变量来适配所有主题。

#### 核心颜色变量（CSS Variables）

```css
/* 主色调 */
--primary-color: 主题主色
--primary-hover: 主色悬停态
--primary-light: 主色浅色（10% 透明度）
--primary-dark: 主色深色

/* 文字颜色 */
--text-primary: 一级标题/主要内容
--text-secondary: 正文/次要内容
--text-muted: 辅助信息/禁用态
--text-inverse: 反色（通常为白色）

/* 背景颜色 */
--bg-page: 页面背景
--bg-card: 卡片/容器背景
--bg-hover: 悬停态背景
--bg-active: 激活态背景
--bg-secondary: 次要背景
--bg-tertiary: 第三级背景

/* 边框颜色 */
--border-color: 标准边框
--border-color-hover: 悬停态边框
--border-color-active: 激活态边框

/* 语义色 */
--success-color: 成功/正确
--success-light: 成功浅色
--warning-color: 警告
--warning-light: 警告浅色
--danger-color: 危险/错误
--danger-light: 危险浅色
--info-color: 信息
--info-light: 信息浅色
```

#### 预设主题颜色

| 主题名称 | 主色 | 特点 | 适用场景 |
|---------|------|------|---------|
| modern-blue | #00BAFF | 科技蓝，现代简洁 | 日间模式（默认） |
| deep-space | #2D68FF | 深空蓝，专业沉浸 | 夜间模式 |
| cyber-tech | #00F2FF | 赛博霓虹，未来感 | 高科技场景 |
| edu-friendly | #FF6B35 | 活力橙，温暖友好 | 教育场景 |
| neo-brutalism | #FFF000 | 大胆黄，艺术风格 | 创意场景 |
| minimal-pure | #000000 | 极简黑白，专注 | 内容优先 |

### 1.2 使用颜色的最佳实践

**✅ 推荐做法：**
```vue
<template>
  <div class="my-component">
    <button class="btn-primary">操作</button>
    <span class="text-secondary">辅助信息</span>
  </div>
</template>

<style scoped lang="scss">
.my-component {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-primary {
  background: var(--primary-color);
  color: var(--text-inverse);
  
  &:hover {
    background: var(--primary-hover);
  }
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
```

**❌ 避免做法：**
```vue
<!-- 硬编码颜色值 -->
<div style="background: #ffffff; color: #333333;">
  <!-- 无法适配主题切换 -->
</div>
```

---

## 2. 排版系统

### 2.1 字体配置

```css
/* 字体族 */
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
              "Helvetica Neue", Arial, sans-serif

/* 字体大小 */
--font-size-xs: 12px    /* 标签、徽章 */
--font-size-sm: 13px    /* 辅助文本 */
--font-size-md: 14px    /* 正文（默认） */
--font-size-lg: 16px    /* 小标题 */
--font-size-xl: 18px    /* 大标题 */

/* 字体粗细 */
--font-weight: 400          /* 正常 */
--font-weight-medium: 500   /* 中等 */
--font-weight-bold: 600     /* 加粗 */
```

### 2.2 排版规范

```scss
// 标题层级
h1 { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); }
h2 { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }
h3 { font-size: var(--font-size-md); font-weight: var(--font-weight-medium); }

// 正文
p { font-size: var(--font-size-md); line-height: 1.6; }

// 标签
.label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }

// 辅助文本
.hint { font-size: var(--font-size-xs); color: var(--text-muted); }
```

---

## 3. 间距系统

### 3.1 间距变量

```css
--spacing-xs: 4px      /* 微小间距 */
--spacing-sm: 8px      /* 小间距 */
--spacing-md: 16px     /* 标准间距 */
--spacing-lg: 24px     /* 大间距 */
--spacing-xl: 32px     /* 超大间距 */
```

### 3.2 应用场景

```scss
// 组件内部间距
.card {
  padding: var(--spacing-md);
  
  .card-header {
    margin-bottom: var(--spacing-md);
  }
  
  .card-item {
    margin-bottom: var(--spacing-sm);
  }
}

// 组件间距
.form-group {
  margin-bottom: var(--spacing-lg);
}

// 列表项间距
.list-item {
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border-color);
  
  &:last-child {
    border-bottom: none;
  }
}
```

---

## 4. 圆角系统

### 4.1 圆角变量

```css
--radius-sm: 12px      /* 小圆角（按钮、输入框） */
--radius-md: 20px      /* 中圆角（卡片、对话框） */
--radius-lg: 24px      /* 大圆角（容器） */
--radius-full: 9999px  /* 完全圆形 */
```

### 4.2 应用规则

| 元素 | 圆角 | 示例 |
|------|------|------|
| 按钮 | var(--radius-sm) | 12px |
| 输入框 | var(--radius-sm) | 12px |
| 卡片 | var(--radius-md) | 20px |
| 对话框 | var(--radius-lg) | 24px |
| 徽章/标签 | var(--radius-full) | 9999px |
| 头像 | var(--radius-full) | 9999px |

---

## 5. 阴影系统

### 5.1 阴影变量

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12)
--shadow-primary: 0 8px 20px -4px rgba(主色, 0.3)
```

### 5.2 应用场景

```scss
// 卡片阴影
.card {
  box-shadow: var(--shadow-sm);
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
}

// 浮动元素
.floating-btn {
  box-shadow: var(--shadow-lg);
}

// 主色强调
.highlight-box {
  box-shadow: var(--shadow-primary);
}
```

---

## 6. 动画系统

### 6.1 过渡变量

```css
--transition-fast: 0.15s ease      /* 快速反馈 */
--transition-normal: 0.2s ease     /* 标准过渡 */
--transition-slow: 0.3s ease       /* 缓慢过渡 */
```

### 6.2 使用示例

```scss
// 快速反馈（悬停、点击）
.btn {
  transition: all var(--transition-fast);
  
  &:hover {
    transform: translateY(-2px);
  }
}

// 标准过渡（打开/关闭）
.modal {
  transition: opacity var(--transition-normal), 
              transform var(--transition-normal);
}

// 缓慢过渡（页面切换）
.page-enter-active,
.page-leave-active {
  transition: all var(--transition-slow);
}
```

---

## 7. 组件样式规范

### 7.1 按钮

```vue
<template>
  <!-- 主要按钮 -->
  <button class="btn btn-primary">确认</button>
  
  <!-- 次要按钮 -->
  <button class="btn btn-secondary">取消</button>
  
  <!-- 危险按钮 -->
  <button class="btn btn-danger">删除</button>
  
  <!-- 禁用状态 -->
  <button class="btn btn-primary" disabled>禁用</button>
</template>

<style scoped lang="scss">
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: var(--primary-color);
  color: var(--text-inverse);
  
  &:hover:not(:disabled) {
    background: var(--primary-hover);
  }
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  
  &:hover:not(:disabled) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
}

.btn-danger {
  background: var(--danger-color);
  color: var(--text-inverse);
  
  &:hover:not(:disabled) {
    filter: brightness(0.9);
  }
}
</style>
```

### 7.2 卡片

```vue
<template>
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">卡片标题</h3>
    </div>
    <div class="card-body">
      <p>卡片内容</p>
    </div>
    <div class="card-footer">
      <button class="btn btn-primary">操作</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all var(--transition-normal);
  
  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}

.card-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.card-body {
  padding: var(--spacing-md);
  color: var(--text-secondary);
}

.card-footer {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  background: var(--bg-hover);
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}
</style>
```

### 7.3 表单输入

```vue
<template>
  <div class="form-group">
    <label class="form-label">用户名</label>
    <input type="text" class="form-input" placeholder="请输入用户名">
  </div>
</template>

<style scoped lang="scss">
.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.form-input {
  width: 100%;
  padding: 10px var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
  
  &::placeholder {
    color: var(--text-muted);
  }
  
  &:hover {
    border-color: var(--border-color-hover);
  }
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
}
</style>
```

### 7.4 表格

```vue
<template>
  <table class="data-table">
    <thead>
      <tr>
        <th>名称</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>项目 1</td>
        <td><span class="badge badge-success">活跃</span></td>
        <td><button class="btn-link">编辑</button></td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  
  thead {
    background: var(--bg-hover);
    
    th {
      padding: var(--spacing-md);
      text-align: left;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
    }
  }
  
  tbody {
    tr {
      transition: background var(--transition-fast);
      
      &:hover {
        background: var(--bg-hover);
      }
      
      td {
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
      }
      
      &:last-child td {
        border-bottom: none;
      }
    }
  }
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  
  &.badge-success {
    background: var(--success-light);
    color: var(--success-color);
  }
  
  &.badge-warning {
    background: var(--warning-light);
    color: var(--warning-color);
  }
  
  &.badge-danger {
    background: var(--danger-light);
    color: var(--danger-color);
  }
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  text-decoration: none;
  transition: color var(--transition-fast);
  
  &:hover {
    color: var(--primary-hover);
    text-decoration: underline;
  }
}
</style>
```

---

## 8. 布局规范

### 8.1 侧边栏设计

```scss
// 侧边栏宽度
$sidebar-width: 280px;
$sidebar-width-collapsed: 64px;

.sidebar {
  width: $sidebar-width;
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  transition: width var(--transition-normal);
  
  &.collapsed {
    width: $sidebar-width-collapsed;
  }
}

.sidebar-item {
  padding: var(--spacing-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: var(--radius-sm);
  margin: var(--spacing-sm);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--primary-light);
    color: var(--primary-color);
    font-weight: var(--font-weight-medium);
  }
}
```

### 8.2 导航栏设计

```scss
$navbar-height: 64px;

.navbar {
  height: $navbar-height;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-lg);
  gap: var(--spacing-lg);
}

.navbar-item {
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
  
  &:hover {
    color: var(--primary-color);
  }
  
  &.active {
    color: var(--primary-color);
    font-weight: var(--font-weight-medium);
  }
}
```

### 8.3 响应式布局

```scss
// 桌面端（1024px+）
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-lg);
  }
}

// 平板端（768px - 1023px）
@media (min-width: 768px) and (max-width: 1023px) {
  .container {
    padding: var(--spacing-md);
  }
  
  .sidebar {
    width: $sidebar-width-collapsed;
  }
}

// 手机端（< 768px）
@media (max-width: 767px) {
  .container {
    padding: var(--spacing-sm);
  }
  
  .sidebar {
    position: fixed;
    left: -$sidebar-width;
    top: $navbar-height;
    height: calc(100vh - $navbar-height);
    z-index: 100;
    transition: left var(--transition-normal);
    
    &.open {
      left: 0;
    }
  }
  
  .navbar {
    padding: 0 var(--spacing-md);
  }
}
```

---

## 9. Element Plus 集成

### 9.1 主题色覆盖

插件应该使用 Element Plus 的 CSS 变量来保持一致性：

```css
:root {
  --el-color-primary: var(--primary-color);
  --el-color-success: var(--success-color);
  --el-color-warning: var(--warning-color);
  --el-color-danger: var(--danger-color);
  --el-color-info: var(--info-color);
  
  --el-bg-color: var(--bg-page);
  --el-bg-color-page: var(--bg-page);
  --el-text-color-primary: var(--text-primary);
  --el-text-color-regular: var(--text-secondary);
  --el-border-color: var(--border-color);
}
```

### 9.2 Element Plus 组件使用

```vue
<template>
  <!-- 按钮 -->
  <el-button type="primary">主要按钮</el-button>
  <el-button>默认按钮</el-button>
  
  <!-- 输入框 -->
  <el-input v-model="input" placeholder="请输入"></el-input>
  
  <!-- 选择框 -->
  <el-select v-model="selected" placeholder="请选择">
    <el-option label="选项 1" value="1"></el-option>
  </el-select>
  
  <!-- 表格 -->
  <el-table :data="tableData">
    <el-table-column prop="name" label="名称"></el-table-column>
  </el-table>
  
  <!-- 对话框 -->
  <el-dialog v-model="dialogVisible" title="对话框">
    <p>对话框内容</p>
  </el-dialog>
</template>
```

---

## 10. 主题适配检查清单

### 10.1 开发时检查

- [ ] 所有颜色使用 CSS 变量（`var(--*)`）
- [ ] 所有间距使用间距变量（`var(--spacing-*)`）
- [ ] 所有圆角使用圆角变量（`var(--radius-*)`）
- [ ] 所有阴影使用阴影变量（`var(--shadow-*)`）
- [ ] 所有过渡使用过渡变量（`var(--transition-*)`）
- [ ] 文字颜色使用文字变量（`var(--text-*)`）
- [ ] 背景颜色使用背景变量（`var(--bg-*)`）
- [ ] 边框颜色使用边框变量（`var(--border-*)`）

### 10.2 测试时检查

- [ ] 在所有 6 种主题下测试视觉效果
- [ ] 检查深色模式下的对比度
- [ ] 检查浅色模式下的可读性
- [ ] 验证悬停/激活状态在各主题下的表现
- [ ] 测试响应式布局在各屏幕尺寸下的表现
- [ ] 验证 Element Plus 组件在各主题下的样式

---

## 11. 实际案例

### 11.1 用户管理插件前端

**位置：** `plugins/user-management/`

**特点：**
- 使用 Element Plus 风格的后台配色和表单布局
- 包含列表、批量创建、权限视图等典型后台场景
- 保持与主框架一致的 iframe 嵌入式交互

**关键文件：**
- `src/styles/index.css` - 全局样式和主题变量适配
- `src/layout/AppLayout.vue` - 应用布局结构
- `src/views/UserList.vue` - 列表页参考实现

### 11.2 计数器插件

**位置：** `plugins/counter-plugin/`

**特点：**
- 独立的 HTML/CSS/JS 实现
- 渐变背景和现代化设计
- 与主框架通过 postMessage 通信

**关键文件：**
- `index.html` - 完整的 UI 和样式

---

## 12. 常见问题

### Q: 如何在插件中使用主系统的主题？

A: 在插件的 HTML 或 Vue 组件中使用 CSS 变量。主系统会通过 `<html>` 标签的 `data-theme` 属性或 `class` 来切换主题，CSS 变量会自动更新。

```vue
<style scoped lang="scss">
.my-component {
  background: var(--bg-card);
  color: var(--text-primary);
}
</style>
```

### Q: 插件可以有自己的颜色吗？

A: 可以，但应该基于主系统的颜色体系。如果需要额外的颜色，应该在插件的 CSS 中定义，并使用主色作为基础。

```scss
:root {
  --plugin-accent: var(--primary-color);
  --plugin-accent-light: var(--primary-light);
}
```

### Q: 如何处理不支持 CSS 变量的旧浏览器？

A: 提供 fallback 值：

```scss
.component {
  background: #ffffff; /* fallback */
  background: var(--bg-card);
}
```

### Q: 插件中的 Element Plus 版本不同怎么办？

A: 确保使用兼容的版本。主系统使用 Element Plus 2.x，建议插件也使用相同版本。如果必须使用不同版本，需要在插件中单独配置主题。

---

## 13. 资源链接

### 主系统设计文件

- **主题配置：** `web/src/styles/themes/index.ts`
- **CSS 变量：** `web/src/styles/themes/variables.scss`
- **全局样式：** `web/src/styles/index.scss`
- **Element Plus 适配：** `web/src/styles/themes/parts/_element-plus.scss`

### 参考实现

- **用户管理插件：** `plugins/user-management/`
- **计数器插件：** `plugins/counter-plugin/`

### 文档

- **Vite 配置：** `web/vite.config.ts`
- **UnoCSS 配置：** `web/uno.config.ts`
- **Element Plus 文档：** https://element-plus.org/

---

## 14. 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2024-03-10 | 初始版本，包含完整的设计系统规范 |

---

**最后更新：** 2024-03-10  
**维护者：** 设计系统团队  
**反馈：** 如有问题或建议，请提交 Issue 或 PR
