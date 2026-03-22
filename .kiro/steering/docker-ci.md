---
inclusion: fileMatch
fileMatchPattern: '**/*.yml,**/Dockerfile*,**/docker*,**/nginx*'
---

# Docker / CI 规则

- 禁止在 CI 中生成短 hash（SHA）的 Docker tag（如 `type=sha,prefix=`）。
  - 原因：腾讯云镜像仓库 tag 上限 100，短 hash tag 会快速耗尽配额。
  - 只允许分支名 tag（`type=ref,event=branch`）和条件性 `latest` tag。

- **Alpine 容器中必须使用 `127.0.0.1`，禁止使用 `localhost`。**
  - 原因：Alpine 镜像默认没有 `/etc/hosts` 中的 `localhost` 条目，`localhost` 无法解析为 `127.0.0.1`。
  - 适用范围：所有 `nginx:alpine`、`node:*-alpine` 等基于 Alpine 的镜像。
  - 包括：Dockerfile 中的健康检查、shell 脚本中的 `wget`/`curl` 调用、nginx 配置中的 `resolver` 等。

# Nginx 反向代理经验

- **反向代理到 HTTPS 上游时，必须加 `proxy_ssl_server_name on;`。**
  - 原因：nginx 默认不发送 SNI（Server Name Indication），上游如果是共享 IP 的 HTTPS 服务（CDN、云服务等），无法确定证书，SSL 握手失败 → 502 Bad Gateway。
  - 症状：容器内 `wget` 直接访问上游 HTTPS 也会超时/失败，容易误判为网络/防火墙问题。

- **反向代理到 HTTPS 上游时，Host 头必须用 `$proxy_host` 而非 `$host`。**
  - `$host` = 客户端请求的域名（如 `t.dev.xrugc.com`）
  - `$proxy_host` = proxy_pass 目标的域名（如 `api.t.xrteeth.com`）
  - 上游服务器根据 Host 头路由请求，发错域名会导致 404 或拒绝连接。

- **排查 502 的正确顺序：**
  1. 先查 `/var/log/nginx/error.log`，看具体错误（SSL handshake / connection refused / timeout）
  2. 检查 `proxy_ssl_server_name` 和 `Host` 头配置
  3. 在容器内用 `wget --no-check-certificate https://上游域名/路径` 测试直连
  4. 最后才考虑网络/防火墙问题
