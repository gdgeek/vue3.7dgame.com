---
inclusion: manual
---

# 验证循环

> 改编自 Everything Claude Code 的 verification-loop skill。

## 概念

验证循环是一种持续验证代码变更的工作流，确保每次修改都不会破坏现有功能。

## 验证流程

```
代码变更 → 类型检查 → Lint → 单元测试 → 构建 → 验证通过
    ↑                                          ↓
    ←←←←←←←← 修复问题 ←←←←←←←←←←←←←←←←←← 失败
```

## 检查点（Checkpoint）

在以下时机创建检查点：

1. 完成一个功能模块后
2. 重构前后
3. 合并分支前
4. 部署前

### 检查点内容

```markdown
## Checkpoint: [描述]
- 时间: [timestamp]
- 变更文件: [file list]
- 类型检查: ✅/❌
- Lint: ✅/❌
- 测试: ✅/❌ (X/Y passed)
- 构建: ✅/❌
```

## 验证命令

```bash
# 类型检查
npx vue-tsc --noEmit

# Lint
npm run lint

# 单元测试
npm run test:unit

# 构建
npm run build
```

## 持续验证策略

### 每次文件保存后
- 自动 lint（通过 IDE 或 hook）
- 类型检查

### 每次 commit 前
- 运行完整 lint
- 运行相关测试
- 类型检查

### 每次 PR 前
- 完整测试套件
- 构建验证
- 代码审查

## 失败处理

1. 立即停止当前工作
2. 分析失败原因
3. 修复问题
4. 重新运行验证
5. 确认通过后继续
