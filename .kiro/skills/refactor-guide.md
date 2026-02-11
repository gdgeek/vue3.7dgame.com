---
inclusion: manual
---

# 重构指南

> 改编自 Everything Claude Code 的 refactor-cleaner agent。

## 重构原则

1. 先有测试，再重构
2. 小步前进，频繁验证
3. 一次只做一种重构
4. 保持功能不变

## 常见重构场景

### 1. 死代码清理

检查并移除：
- 未使用的导入
- 未调用的函数
- 注释掉的代码块
- 未使用的变量和类型
- 废弃的组件

```bash
# 检查未使用的导入和变量
npx eslint --rule 'no-unused-vars: error' src/
```

### 2. 提取组件

当一个 Vue 组件超过 300 行时，考虑拆分：

```
BigComponent.vue (500 行)
  → BigComponent.vue (150 行，组合子组件)
  → components/Header.vue (100 行)
  → components/Content.vue (150 行)
  → composables/useBigLogic.ts (100 行)
```

### 3. 提取 Composable

当多个组件共享相同逻辑时：

```typescript
// composables/useSearch.ts
export function useSearch(initialQuery = '') {
  const query = ref(initialQuery)
  const results = ref([])
  const loading = ref(false)

  const search = async () => {
    loading.value = true
    try {
      results.value = await api.search(query.value)
    } finally {
      loading.value = false
    }
  }

  return { query, results, loading, search }
}
```

### 4. API 层重构

统一 API 调用模式：

```typescript
// 统一的 API 请求封装
export function createApiService<T>(baseUrl: string) {
  return {
    getList: (params?: Record<string, any>) =>
      request.get<T[]>(baseUrl, { params }),
    getById: (id: string) =>
      request.get<T>(`${baseUrl}/${id}`),
    create: (data: Partial<T>) =>
      request.post<T>(baseUrl, data),
    update: (id: string, data: Partial<T>) =>
      request.put<T>(`${baseUrl}/${id}`, data),
    remove: (id: string) =>
      request.delete(`${baseUrl}/${id}`)
  }
}
```

## 重构检查清单

- [ ] 所有测试通过
- [ ] 无新增 lint 错误
- [ ] 类型检查通过
- [ ] 构建成功
- [ ] 功能行为不变
