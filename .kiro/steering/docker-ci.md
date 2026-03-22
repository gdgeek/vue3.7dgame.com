---
inclusion: fileMatch
fileMatchPattern: '**/*.yml,**/Dockerfile*,**/docker*'
---

# Docker / CI 规则

- 禁止在 CI 中生成短 hash（SHA）的 Docker tag（如 `type=sha,prefix=`）。
  - 原因：腾讯云镜像仓库 tag 上限 100，短 hash tag 会快速耗尽配额。
  - 只允许分支名 tag（`type=ref,event=branch`）和条件性 `latest` tag。

- **Alpine 容器中必须使用 `127.0.0.1`，禁止使用 `localhost`。**
  - 原因：Alpine 镜像默认没有 `/etc/hosts` 中的 `localhost` 条目，`localhost` 无法解析为 `127.0.0.1`。
  - 适用范围：所有 `nginx:alpine`、`node:*-alpine` 等基于 Alpine 的镜像。
  - 包括：Dockerfile 中的健康检查、shell 脚本中的 `wget`/`curl` 调用、nginx 配置中的 `resolver` 等。
