---
inclusion: fileMatch
fileMatchPattern: "**/*.ts"
---

# TypeScript 模式指南

> 改编自 Everything Claude Code 的 typescript rules。

## 类型安全

- 启用 `strict` 模式
- 避免类型断言（`as`），除非确实必要
- 使用类型守卫（type guards）而非断言
- 泛型优先于 `any`

## 常用模式

### 类型守卫

```typescript
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj
}
```

### 工具类型

```typescript
// 部分更新
type UpdateUser = Partial<Pick<User, 'name' | 'email'>>

// 只读
type ReadonlyUser = Readonly<User>

// 记录类型
type UserMap = Record<string, User>
```

### 错误处理

```typescript
// 自定义错误
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

## 导入规范

```typescript
// 1. 第三方库
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

// 2. 项目内部模块（按路径深度排序）
import { useUserStore } from '@/stores/user'
import { formatDate } from '@/utils/date'

// 3. 类型导入（使用 type 关键字）
import type { User, UserRole } from '@/types/user'
```
