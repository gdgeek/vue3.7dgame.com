---
inclusion: manual
---

# 性能优化技能

> 改编自 Everything Claude Code 的 performance 规则。

## Vue 性能优化

### 组件级别

- 使用 `shallowRef` 替代 `ref`（当不需要深层响应式时）
- 大列表使用 `v-memo` 或虚拟滚动
- 使用 `defineAsyncComponent` 懒加载组件
- 避免在模板中使用复杂计算，用 `computed` 代替
- 使用 `v-once` 标记静态内容

### 路由级别

```typescript
// 路由懒加载
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/dashboard/index.vue')
  }
]
```

### API 级别

- 请求去重：相同请求在 pending 时不重复发送
- 请求缓存：短时间内相同请求返回缓存
- 分页加载：大数据集使用分页或无限滚动
- 取消请求：组件卸载时取消未完成的请求

### 构建级别

- Tree-shaking：确保依赖支持 ESM
- 代码分割：按路由分割
- 资源压缩：图片使用 WebP，启用 gzip/brotli
- 预加载关键资源

## 性能检测

```bash
# 分析构建产物
npx vite-bundle-visualizer

# Lighthouse 审计
npx lighthouse http://localhost:5173 --view
```

## 性能指标目标

| 指标 | 目标 |
|------|------|
| FCP (First Contentful Paint) | < 1.8s |
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FID (First Input Delay) | < 100ms |
| Bundle Size (gzipped) | < 200KB |
