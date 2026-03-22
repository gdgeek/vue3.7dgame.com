# 部署与运行指南

## 架构概览

本项目是一个 Vue 3 + Vite 前端应用，生产环境使用 Nginx 托管静态文件并提供反向代理。

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器                                                       │
│                                                              │
│  /api/*               → nginx 反向代理 → 后端 API 服务        │
│  /api-backup/*        → nginx 反向代理 → 备用 API 服务        │
│  /api-domain/*        → nginx 反向代理 → 域名信息 API 服务     │
│  /api-domain-backup/* → nginx 反向代理 → 备用域名信息 API 服务  │
│  其他静态资源           → nginx 直接返回 dist/ 文件             │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. 本地开发

### 前置条件

- Node.js 20+
- pnpm（项目强制使用 pnpm）

### 启动步骤

```bash
# 安装依赖
pnpm install

# 启动开发服务器（默认端口 3001）
pnpm dev
```

### 环境变量

本地开发读取 `.env.development`，所有 API 地址通过 `VITE_APP_*` 变量直接注入到前端代码中：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_APP_API_URL` | 主 API 地址 | `http://localhost:8081` |
| `VITE_APP_BACKUP_API_URL` | 备用 API 地址 | `http://localhost:8081` |
| `VITE_APP_DOMAIN_INFO_API_URL` | 域名信息 API | `https://domain.xrteeth.com` |
| `VITE_APP_BLOCKLY_URL` | Blockly 编辑器地址 | `http://localhost:3000/` |
| `VITE_APP_EDITOR_URL` | 代码编辑器地址 | `http://localhost:3002/` |
| `VITE_APP_DOC_API` | 文档 API | `https://hololens2.cn/wp-json/wp/v2/` |
| `VITE_MOCK_DEV_SERVER` | 是否启用 Mock | `false` |

本地开发时，前端直接请求 `VITE_APP_API_URL` 指定的后端地址，不经过 nginx 反向代理。

### Docker 开发模式（可选）

```bash
docker compose -f docker-compose.dev.yml up
```

这会启动 Vite dev server 容器，端口映射到 `3000`，源码通过 volume 挂载实现热更新。

---

## 2. Docker Compose 生产部署

### 构建并启动

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 环境变量配置

在 `docker-compose.prod.yml` 的 `environment` 中配置运行时变量：

```yaml
environment:
  # nginx 反向代理上游地址（用于 nginx.conf.template）
  - APP_API_URL=https://api.xrteeth.com
  - APP_BACKUP_API_URL=https://api.tmrpp.com
  - APP_DOMAIN_INFO_API_URL=https://domain.xrteeth.com
  - APP_BACKUP_DOMAIN_INFO_API_URL=https://domain.tmrpp.com
  # 必须设置，确保只替换 APP_ 前缀变量，不影响 nginx 内置变量
  - NGINX_ENVSUBST_FILTER=APP_
```

### 运行时配置注入机制

容器启动时，nginx 官方镜像自动执行 envsubst：

1. `/etc/nginx/templates/default.conf.template` → `/etc/nginx/conf.d/default.conf`
   - 替换 `${APP_API_URL}`、`${APP_BACKUP_API_URL}`、`${APP_DOMAIN_INFO_API_URL}`、`${APP_BACKUP_DOMAIN_INFO_API_URL}` 为反向代理上游地址

`NGINX_ENVSUBST_FILTER=APP_` 确保只替换 `APP_` 前缀的变量，避免破坏 nginx 配置中的 `$host`、`$remote_addr` 等内置变量。

### 健康检查

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

---

## 3. URL 路由策略

### 走 nginx 反向代理的路径（仅生产环境）

| 路径 | 代理目标 | 配置来源 |
|------|---------|---------|
| `/api/*` | `${APP_API_URL}` | `nginx.conf.template` |
| `/api-backup/*` | `${APP_BACKUP_API_URL}` | `nginx.conf.template` |
| `/api-domain/*` | `${APP_DOMAIN_INFO_API_URL}` | `nginx.conf.template` |
| `/api-domain-backup/*` | `${APP_BACKUP_DOMAIN_INFO_API_URL}` | `nginx.conf.template` |

前端代码在生产环境中直接请求 `/api`、`/api-backup`、`/api-domain`、`/api-domain-backup`，由 nginx 转发到实际后端。

`src/environment.ts` 中的逻辑：

```typescript
api: import.meta.env.DEV ? import.meta.env.VITE_APP_API_URL : "/api",
backup_api: import.meta.env.DEV ? import.meta.env.VITE_APP_BACKUP_API_URL : "/api-backup",
domain_info: import.meta.env.DEV ? import.meta.env.VITE_APP_DOMAIN_INFO_API_URL : "/api-domain",
domain_info_backup: import.meta.env.DEV ? import.meta.env.VITE_APP_BACKUP_DOMAIN_INFO_API_URL : "/api-domain-backup",
```

> 注意：`/api/` 和 `/api-backup/` 包含 GEEK 自定义请求头和 WebSocket 支持；`/api-domain/` 和 `/api-domain-backup/` 仅包含标准代理头。

### 构建时写死的地址（不可运行时修改）

| 变量 | 用途 | 来源 |
|------|------|------|
| `VITE_APP_DOC_API` | WordPress 文档 API | `.env.production` |
| `VITE_APP_BLOCKLY_URL` | Blockly 编辑器 | `.env.production` |
| `VITE_APP_EDITOR_URL` | 代码编辑器 | `.env.production` |
| `VITE_APP_BASE_MODE` | 域名模式标识 | `.env.production` |

这些值在 `pnpm build` 时由 Vite 内联到 JS bundle 中，容器启动后无法修改。如需更改，必须重新构建镜像。

---

## 4. Dockerfile 说明

项目包含三个 Dockerfile：

| 文件 | 用途 | 构建命令 |
|------|------|---------|
| `Dockerfile` | 通用（含 dev 和 prod 两个 stage） | `pnpm run build` |
| `docker/production/Dockerfile` | 生产专用 | `pnpm run build` |
| `docker/staging/Dockerfile` | 预发布环境 | `pnpm run build:staging` |

三者的 nginx 阶段完全一致：

```dockerfile
FROM nginx:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER=APP_
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

不使用自定义 `docker-entrypoint.sh`，完全依赖 nginx 官方镜像的 envsubst 机制。

---

## 5. 快速参考

```bash
# 本地开发
pnpm dev

# 运行测试
pnpm test:run

# 生产构建
pnpm build

# Docker 生产部署
docker compose -f docker-compose.prod.yml up -d --build

# Docker 开发模式
docker compose -f docker-compose.dev.yml up

# 查看容器日志
docker logs vue3-prod -f
```
