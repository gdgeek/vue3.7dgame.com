---
inclusion: auto
---

# 测试规则

> 改编自 Everything Claude Code 的 testing 规则。

## 核心原则

- 测试是代码的一等公民，不是事后补充
- 目标覆盖率：80%+（关键路径 100%）
- 测试应该快速、独立、可重复

## 测试金字塔

```
    /  E2E  \        少量，验证关键用户流程
   / 集成测试 \      中等，验证模块交互
  /  单元测试  \     大量，验证独立逻辑
```

## 测试命名

使用描述性命名，格式：`should [expected behavior] when [condition]`

```typescript
describe('UserService', () => {
  it('should return user profile when valid ID is provided', () => {})
  it('should throw NotFoundError when user does not exist', () => {})
})
```

## 测试结构（AAA 模式）

```typescript
it('should calculate total correctly', () => {
  // Arrange - 准备测试数据
  const items = [{ price: 10 }, { price: 20 }]

  // Act - 执行被测试的操作
  const total = calculateTotal(items)

  // Assert - 验证结果
  expect(total).toBe(30)
})
```

## 什么必须测试

- API 调用的请求参数和响应处理
- 业务逻辑函数
- 工具函数（utils/helpers）
- 错误处理路径
- 边界条件

## 什么不需要测试

- 第三方库的内部实现
- 纯 UI 样式（除非有交互逻辑）
- 简单的 getter/setter
- 框架自身的功能

## Mock 规范

- 只 mock 外部依赖（API、数据库、文件系统）
- 不要 mock 被测试的模块本身
- Mock 数据要贴近真实数据
- 每个测试后清理 mock 状态
