---
inclusion: fileMatch
fileMatchPattern: '**/*.yml,**/Dockerfile*,**/docker*'
---

# Docker / CI 规则

- 禁止在 CI 中生成短 hash（SHA）的 Docker tag（如 `type=sha,prefix=`）。
  - 原因：腾讯云镜像仓库 tag 上限 100，短 hash tag 会快速耗尽配额。
  - 只允许分支名 tag（`type=ref,event=branch`）和条件性 `latest` tag。
