# 插件设计快速参考

快速查找常用的设计系统变量和代码片段。

## CSS 变量速查表

### 颜色变量

```css
/* 主色调 */
--primary-color          /* 主题主色 */
--primary-hover          /* 主色悬停态 */
--primary-light          /* 主色浅色 */
--primary-dark           /* 主色深色 */

/* 文字 */
--text-primary           /* 一级标题/主要内容 */
--text-secondary         /* 正文/次要内容 */
--text-muted             /* 辅助信息/禁用态 */
--text-inverse           /* 反色（通常白色） */

/* 背景 */
--bg-page                /* 页面背景 */
--bg-card                /* 卡片/容器背景 */
--bg-hover               /* 悬停态背景 */
--bg-active              /* 激活态背景 */
--bg-secondary           /* 次要背景 */
--bg-tertiary            /* 第三级背景 */

/* 边框 */
--border-color           /* 标准边框 */
--border-color-hover     /* 悬停态边框 */
--border-color-active    /* 激活态边框 */

/* 语义色 */
--success-color          /* 成功 */
--success-light          /* 成功浅色 */
--warning-color          /* 警告 */
--warning-light          /* 警告浅色 */
--danger-color           /* 危险/错误 */
--danger-light           /* 危险浅色 */
--info-color             /* 信息 */
--info-light             /* 信息浅色 */
```

### 排版变量

```css
--font-family            /* 字体族 */
--font-size-xs           /* 12px - 标签、徽章 */
--font-size-sm           /* 13px - 辅助文本 */
--font-size-md           /* 14px - 正文（默认） */
--font-size-lg           /* 16px - 小标题 */
--font-size-xl           /* 18px - 大标题 */
--font-weight            /* 400 - 正常 */
--font-weight-medium     /* 500 - 中等 */
--font-weight-bold       /* 600 - 加粗 */
```

### 间距变量

```css
--spacing-xs             /* 4px - 微小间距 */
--spacing-sm             /* 8px - 小间距 */
--spacing-md             /* 16px - 标准间距 */
--spacing-lg             /* 24px - 大间距 */
--spacing-xl             /* 32px - 超大间距 */
```

### 圆角变量

```css
--radius-sm              /* 12px - 按钮、输入框 */
--radius-md              /* 20px - 卡片、对话框 */
--radius-lg              /* 24px - 容器 */
--radius-full            /* 9999px - 完全圆形 */
```

### 阴影变量

```css
--shadow-sm              /* 0 1px 3px rgba(0,0,0,0.05) */
--shadow-md              /* 0 4px 12px rgba(0,0,0,0.08) */
--shadow-lg              /* 0 8px 24px rgba(0,0,0,0.12) */
--shadow-primary         /* 主色阴影 */
```

### 动画变量

```css
--transition-fast        /* 0.15s ease - 快速反馈 */
--transition-normal      /* 0.2s ease - 标准过渡 */
--transition-slow        /* 0.3s ease - 缓慢过渡 */
```

---

## 常用代码片段

### 基础卡片

```vue
<template>
  <div class="card">
    <div class="card-header">
      <h3>标题</h3>
    </div>
    <div class="card-body">
      内容
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
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.card-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }
}

.card-body {
  padding: var(--spacing-md);
  color: var(--text-secondary);
}
</style>
```

### 按钮组

```vue
<template>
  <div class="button-group">
    <button class="btn btn-primary">主要</button>
    <button class="btn btn-secondary">次要</button>
    <button class="btn btn-danger">危险</button>
  </div>
</template>

<style scoped lang="scss">
.button-group {
  display: flex;
  gap: var(--spacing-sm);
}

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

### 表单输入

```vue
<template>
  <div class="form-group">
    <label class="form-label">输入框</label>
    <input type="text" class="form-input" placeholder="请输入">
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

### 简单表格

```vue
<template>
  <table class="data-table">
    <thead>
      <tr>
        <th>名称</th>
        <th>状态</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>项目 1</td>
        <td><span class="badge badge-success">活跃</span></td>
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
  
  tbody tr {
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
}
</style>
```

### 列表项

```vue
<template>
  <ul class="list">
    <li class="list-item">
      <span class="list-label">标签</span>
      <span class="list-value">值</span>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  
  &:last-child {
    border-bottom: none;
  }
}

.list-label {
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.list-value {
  color: var(--text-primary);
}
</style>
```

### 响应式网格

```vue
<template>
  <div class="grid">
    <div class="grid-item">项目 1</div>
    <div class="grid-item">项目 2</div>
    <div class="grid-item">项目 3</div>
  </div>
</template>

<style scoped lang="scss">
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
}

.grid-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  transition: all var(--transition-normal);
  
  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}
</style>
```

---

## 主题颜色速查

| 主题 | 主色 | 用途 |
|------|------|------|
| modern-blue | #00BAFF | 日间模式（默认） |
| deep-space | #2D68FF | 夜间模式 |
| cyber-tech | #00F2FF | 高科技场景 |
| edu-friendly | #FF6B35 | 教育场景 |
| neo-brutalism | #FFF000 | 创意场景 |
| minimal-pure | #000000 | 内容优先 |

---

## 检查清单

开发插件时使用此清单确保设计一致性：

- [ ] 使用 CSS 变量而不是硬编码颜色
- [ ] 所有间距使用 `var(--spacing-*)`
- [ ] 所有圆角使用 `var(--radius-*)`
- [ ] 所有阴影使用 `var(--shadow-*)`
- [ ] 所有过渡使用 `var(--transition-*)`
- [ ] 在深色模式下测试对比度
- [ ] 在浅色模式下测试可读性
- [ ] 测试所有 6 种主题
- [ ] 验证响应式布局
- [ ] Element Plus 组件使用主题色

---

## 常见问题

**Q: 如何快速开始？**  
A: 复制上面的代码片段，替换颜色值为 CSS 变量即可。

**Q: 如何测试主题切换？**  
A: 在浏览器开发者工具中修改 `<html>` 的 `class` 或 `data-theme` 属性。

**Q: 如何处理自定义颜色？**  
A: 在插件的 CSS 中定义，基于主系统的主色：
```css
:root {
  --plugin-custom: var(--primary-color);
}
```

**Q: Element Plus 组件不适配怎么办？**  
A: 在插件的全局样式中覆盖 Element Plus 的 CSS 变量。

---

**更新时间：** 2024-03-11  
**相关文档：** [完整设计指南](./plugin-design-guide.md)
