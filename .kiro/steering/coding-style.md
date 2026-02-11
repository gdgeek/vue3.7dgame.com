---
inclusion: auto
---

# 编码风格规则

> 改编自 Everything Claude Code 的 coding-style 规则，适配本项目的 Vue 3 + TypeScript 技术栈。

## 核心原则

1. 可读性优先：代码被阅读的次数远多于编写次数
2. 保持简单（KISS）：不要过度工程化
3. 不要重复自己（DRY）：但不要为了 DRY 而牺牲可读性
4. 显式优于隐式：让意图清晰

## 文件组织

- 每个文件只做一件事
- 文件名使用 kebab-case（如 `user-profile.vue`、`api-client.ts`）
- 相关文件放在同一目录下
- 导出的类型放在独立的 `types.ts` 或 `model.ts` 文件中

## TypeScript 规范

- 优先使用 `interface` 而非 `type`（除非需要联合类型）
- 避免 `any`，使用 `unknown` 代替
- 函数参数和返回值必须有类型注解
- 使用 `const` 优先，必要时才用 `let`，禁止 `var`
- 优先使用不可变数据结构（`readonly`、`Readonly<T>`）

## Vue 组件规范

- 使用 `<script setup lang="ts">` Composition API
- Props 使用 TypeScript 泛型定义：`defineProps<{ ... }>()`
- Emits 使用类型定义：`defineEmits<{ ... }>()`
- 组件名使用 PascalCase
- 模板中组件使用 PascalCase

## 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getUserName` |
| 类/接口/类型 | PascalCase | `UserProfile` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件名 | kebab-case | `user-profile.vue` |
| CSS 类 | kebab-case | `user-avatar` |
| 枚举值 | PascalCase | `Status.Active` |

## 错误处理

- 永远不要吞掉错误（空 catch 块）
- API 调用必须有错误处理
- 使用自定义错误类型区分不同错误
- 用户可见的错误信息要友好且有帮助

## 注释规范

- 代码应该自解释，注释解释"为什么"而非"是什么"
- TODO 格式：`// TODO: [描述] - [日期]`
- FIXME 格式：`// FIXME: [描述] - [日期]`
- 复杂业务逻辑必须有注释
