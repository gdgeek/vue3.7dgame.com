---
inclusion: auto
---

# Git 工作流规则

> 改编自 Everything Claude Code 的 git-workflow 规则。

## Commit 规范

使用 Conventional Commits 格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Type 类型

| Type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 格式调整（不影响代码逻辑） |
| `refactor` | 重构（不新增功能也不修复 bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具变更 |
| `ci` | CI 配置变更 |

### 规则

- 描述使用中文或英文，保持一致
- 描述不超过 72 个字符
- 不要在描述末尾加句号
- 每个 commit 只做一件事
- 先 commit 再 push，不要积攒大量变更

## 分支策略

- `main` / `master`：生产分支，始终可部署
- `develop`：开发分支
- `feature/*`：功能分支
- `fix/*`：修复分支
- `hotfix/*`：紧急修复

## PR 规范

- PR 标题遵循 Conventional Commits 格式
- PR 描述包含：变更内容、测试方式、截图（如有 UI 变更）
- 保持 PR 小而聚焦
- 自我审查后再请求他人审查
