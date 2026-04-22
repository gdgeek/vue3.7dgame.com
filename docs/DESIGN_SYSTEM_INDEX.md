# 设计系统文档索引

欢迎使用混合现实编程教育平台的统一设计系统。本索引帮助您快速找到所需的设计资源和文档。

## 📚 文档导航

### 1. 完整设计指南
**文件：** [`plugin-design-guide.md`](./plugin-design-guide.md)  
**内容：** 完整的设计系统规范，包括：
- 颜色系统（6 种主题）
- 排版规范
- 间距系统
- 圆角、阴影、动画
- 组件样式详解
- 布局规范
- Element Plus 集成
- 主题适配检查清单

**适合：** 需要深入了解设计系统的开发者

---

### 2. 快速参考
**文件：** [`plugin-design-quick-reference.md`](./plugin-design-quick-reference.md)  
**内容：** 快速查找和复制粘贴：
- CSS 变量速查表
- 常用代码片段（卡片、按钮、表单、表格等）
- 主题颜色速查
- 开发检查清单
- 常见问题解答

**适合：** 快速查找变量和代码片段

---

## 🎨 设计系统概览

### 支持的主题

| 主题 | 主色 | 特点 | 场景 |
|------|------|------|------|
| **modern-blue** | #00BAFF | 科技蓝，现代简洁 | 日间模式（默认） |
| **deep-space** | #2D68FF | 深空蓝，专业沉浸 | 夜间模式 |
| **cyber-tech** | #00F2FF | 赛博霓虹，未来感 | 高科技场景 |
| **edu-friendly** | #FF6B35 | 活力橙，温暖友好 | 教育场景 |
| **neo-brutalism** | #FFF000 | 大胆黄，艺术风格 | 创意场景 |
| **minimal-pure** | #000000 | 极简黑白，专注 | 内容优先 |

### 核心设计令牌

```
颜色系统
├── 主色调（primary, hover, light, dark）
├── 文字色（primary, secondary, muted, inverse）
├── 背景色（page, card, hover, active, secondary, tertiary）
├── 边框色（color, hover, active）
└── 语义色（success, warning, danger, info）

排版系统
├── 字体族（font-family）
├── 字体大小（xs, sm, md, lg, xl）
└── 字体粗细（normal, medium, bold）

间距系统
├── xs: 4px
├── sm: 8px
├── md: 16px
├── lg: 24px
└── xl: 32px

圆角系统
├── sm: 12px
├── md: 20px
├── lg: 24px
└── full: 9999px

阴影系统
├── sm: 轻微阴影
├── md: 中等阴影
├── lg: 深阴影
└── primary: 主色阴影

动画系统
├── fast: 0.15s
├── normal: 0.2s
└── slow: 0.3s
```

---

## 🚀 快速开始

### 1. 在插件中使用设计系统

**第一步：** 在 Vue 组件中使用 CSS 变量

```vue
<template>
  <div class="my-component">
    <button class="btn-primary">操作</button>
  </div>
</template>

<style scoped lang="scss">
.my-component {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--primary-color);
  color: var(--text-inverse);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  
  &:hover {
    background: var(--primary-hover);
  }
}
</style>
```

**第二步：** 测试主题切换

在浏览器开发者工具中修改 `<html>` 的 `class` 属性：
```html
<!-- 切换到深空主题 -->
<html class="dark">

<!-- 切换到赛博科技主题 -->
<html class="theme-cyber-tech">
```

### 2. 常用代码片段

快速参考文档中包含以下现成代码片段：
- ✅ 基础卡片
- ✅ 按钮组
- ✅ 表单输入
- ✅ 简单表格
- ✅ 列表项
- ✅ 响应式网格

直接复制使用，只需替换内容即可。

---

## 📋 开发检查清单

在开发插件时，使用此清单确保设计一致性：

### 开发阶段
- [ ] 使用 CSS 变量而不是硬编码颜色
- [ ] 所有间距使用 `var(--spacing-*)`
- [ ] 所有圆角使用 `var(--radius-*)`
- [ ] 所有阴影使用 `var(--shadow-*)`
- [ ] 所有过渡使用 `var(--transition-*)`

### 测试阶段
- [ ] 在所有 6 种主题下测试视觉效果
- [ ] 检查深色模式下的对比度
- [ ] 检查浅色模式下的可读性
- [ ] 验证悬停/激活状态在各主题下的表现
- [ ] 测试响应式布局在各屏幕尺寸下的表现
- [ ] 验证 Element Plus 组件在各主题下的样式

---

## 🔗 相关资源

### 主系统设计文件

| 文件 | 位置 | 说明 |
|------|------|------|
| 主题配置 | `web/src/styles/themes/index.ts` | 6 种主题的完整定义 |
| CSS 变量 | `web/src/styles/themes/variables.scss` | 所有 CSS 变量的默认值 |
| 全局样式 | `web/src/styles/index.scss` | 全局样式入口 |
| Element Plus 适配 | `web/src/styles/themes/parts/_element-plus.scss` | Element Plus 主题覆盖 |
| Vite 配置 | `web/vite.config.ts` | 构建配置 |
| UnoCSS 配置 | `web/uno.config.ts` | 原子化 CSS 配置 |

### 参考实现

| 项目 | 位置 | 特点 |
|------|------|------|
| 用户管理插件 | `plugins/user-management/` | Element Plus 风格后台表格、表单与权限视图 |
| 计数器插件 | `plugins/counter-plugin/` | 独立 HTML/CSS/JS，现代化设计 |

### 外部文档

- [Element Plus 官方文档](https://element-plus.org/)
- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)

---

## ❓ 常见问题

### Q: 如何在插件中使用主系统的主题？

A: 在插件的 HTML 或 Vue 组件中使用 CSS 变量。主系统会通过 `<html>` 标签的 `class` 或 `data-theme` 属性来切换主题，CSS 变量会自动更新。

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

### Q: 如何测试主题切换？

A: 在浏览器开发者工具中修改 `<html>` 的 `class` 属性：

```javascript
// 在浏览器控制台执行
document.documentElement.className = 'dark'  // 深色模式
document.documentElement.className = 'theme-cyber-tech'  // 赛博科技
```

### Q: 响应式布局应该如何处理？

A: 使用标准的媒体查询断点：

```scss
// 桌面端（1024px+）
@media (min-width: 1024px) { }

// 平板端（768px - 1023px）
@media (min-width: 768px) and (max-width: 1023px) { }

// 手机端（< 768px）
@media (max-width: 767px) { }
```

---

## 📞 获取帮助

### 遇到问题？

1. **查看快速参考** - 大多数常见问题都有解答
2. **查看完整指南** - 深入了解设计系统的各个方面
3. **参考实现** - 查看用户管理插件或计数器插件的实现
4. **检查清单** - 确保遵循了所有设计规范

### 提交反馈

如有问题或建议，请：
- 提交 Issue
- 创建 Pull Request
- 联系设计系统团队

---

## 📝 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2024-03-11 | 初始版本，包含完整的设计系统文档 |

---

**最后更新：** 2024-03-11  
**维护者：** 设计系统团队  
**许可证：** MIT
