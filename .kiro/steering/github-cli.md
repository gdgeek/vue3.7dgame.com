---
inclusion: auto
---

# GitHub CLI 规则

- 查看 GitHub 相关信息（CI 状态、PR、Issues、Actions 等）时，优先使用 `gh` CLI 命令，而不是通过浏览器 MCP 打开 GitHub 页面。
- `gh` 更快、输出结构化、不需要登录状态，适合自动化场景。
- 常用命令：
  - `gh run list` — 查看最近的 CI 运行
  - `gh run view <run-id>` — 查看某次运行详情
  - `gh run watch <run-id>` — 实时监控运行状态
  - `gh pr list` / `gh pr view` — PR 相关
  - `gh issue list` — Issues 相关
