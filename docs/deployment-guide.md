# 部署与运行指南

## 架构概览

本项目是一个 Vue 3 + Vite 前端应用，生产环境使用 Nginx 托管静态文件并提供反向代理。

主 API（`/api/`）和域名信息 API（`/api-domain/`）均采用 Nginx 层面的多后端 failover 机制：通过 `error_page` + 命名 location 链式切换，当主后端不可用时自动尝试备用后端。后端数量通过编号环境变量动态配置。

```
┌──────────────────────────────────────────────────────────────┐
│  浏览器                                                       │
│                                                              │
│  /api/*               → nginx failover 链 → 后端 1 → 后端 2  │
│  /api-domain/*        → nginx failover 链 → 域名 1 → 域名 2  │
│  /api-doc/*           → nginx 反向代理 → WordPress 文档 API     │
│  其他静态资源           → nginx 直接返回 dist/ 文件             │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. 本地开发

### 前置条件

- Node.js 24+
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
| `VITE_APP_DOMAIN_INFO_API_URL` | 域名信息 API | `https://domain.xrteeth.com` |
| `VITE_APP_BLOCKLY_URL` | Blockly 编辑器地址 | `http://localhost:3000/` |
| `VITE_APP_EDITOR_URL` | 代码编辑器地址 | `http://localhost:3002/` |
| `VITE_APP_DOC_API` | 文档 API | `https://hololens2.cn/wp-json/wp/v2/` |
| `VITE_MOCK_DEV_SERVER` | 是否启用 Mock | `false` |

本地开发时，前端直接请求 `VITE_APP_API_URL` 指定的后端地址，不经过 nginx 反向代理。

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
  # 主 API 后端（编号格式，支持多个）
  - APP_API_1_URL=https://api.xrteeth.com
  - APP_API_2_URL=https://api.tmrpp.com

  # 域名信息 API（编号格式，同上）
  - APP_DOMAIN_1_URL=https://domain.xrteeth.com
  - APP_DOMAIN_2_URL=https://domain.tmrpp.com

  # 文档 API（可选，不配置则文档功能不显示）
  - APP_DOC_API_URL=https://hololens2.cn/wp-json/wp/v2
```

### 多后端 Failover 机制

主 API 使用编号环境变量 `APP_API_N_URL`（N=1,2,3...）配置多个后端。容器启动时，`docker-entrypoint.sh` 脚本会：

1. 遍历所有 `APP_API_N_URL` 环境变量（按编号顺序）
2. 自动从 URL 提取 Host 头（因为不同后端域名不同，需要正确的 Host 头）
3. 生成链式 failover 的 nginx location 块：
   - `APP_API_1_URL` → `location /api/`（主入口，`proxy_connect_timeout 5s` 快速失败）
   - `APP_API_2_URL` → `location @api_backup_2`（命名 location，通过 `error_page 502 504` 触发）
   - `APP_API_3_URL` → `location @api_backup_3`（继续链式）
   - 最后一个后端不设 `error_page`（兜底）
4. 将生成的 location 块注入 `nginx.conf.template` 的 `# __API_LOCATIONS__` 占位符
5. 对其他 `APP_*` 变量执行 envsubst 替换
6. 启动 nginx

failover 是请求级别的：每个请求独立判断，主后端返回 502/504 时自动尝试下一个备用后端。

### 添加更多备用后端

只需在 `docker-compose.prod.yml` 中添加编号环境变量即可，无需修改任何配置文件：

```yaml
environment:
  - APP_API_1_URL=https://api.primary.com
  - APP_API_2_URL=https://api.backup1.com
  - APP_API_3_URL=https://api.backup2.com
```

建议备用后端不超过 3 个，否则链式 failover 延迟累积明显。

### 运行时配置注入机制

容器使用自定义 `docker-entrypoint.sh` 替代 nginx 官方镜像的 envsubst 机制：

1. 解析编号环境变量，动态生成 API failover 配置
2. 对模板中的 `${APP_*}` 变量执行 envsubst 替换
3. 输出最终的 `/etc/nginx/conf.d/default.conf`
4. 执行 `nginx -g 'daemon off;'`

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

| 路径 | 代理目标 | 说明 |
|------|---------|------|
| `/api/*` | `APP_API_1_URL` → `APP_API_2_URL` → ... | 链式 failover，由 entrypoint 动态生成 |
| `/api-domain/*` | `APP_DOMAIN_1_URL` → `APP_DOMAIN_2_URL` → ... | 链式 failover，由 entrypoint 动态生成 |
| `/api-doc/*` | `${APP_DOC_API_URL}`（可选） | WordPress 文档 API |

前端代码在生产环境中直接请求 `/api`、`/api-domain`、`/api-doc`，由 nginx 转发到实际后端。

`src/environment.ts` 中的逻辑：

```typescript
api: import.meta.env.DEV ? import.meta.env.VITE_APP_API_URL : "/api",
domain_info: import.meta.env.DEV ? import.meta.env.VITE_APP_DOMAIN_INFO_API_URL : "/api-domain",
doc: import.meta.env.DEV ? import.meta.env.VITE_APP_DOC_API : "/api-doc",
```

> 注意：`/api/` 的所有 failover location 都包含 GEEK 自定义请求头和 WebSocket 支持。`/api-domain/` 的 failover location 仅包含标准代理头。`/api-doc/` 仅包含标准代理头，是可选的，不配置 `APP_DOC_API_URL` 时前端 `environment.doc` 为空，文档相关功能不显示。

### 构建时写死的地址（不可运行时修改）

| 变量 | 用途 | 来源 |
|------|------|------|
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

三者的 nginx 阶段结构一致：

```dockerfile
FROM nginx:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
```

使用自定义 `docker-entrypoint.sh` 处理动态 API failover 配置生成和 envsubst 替换。

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
