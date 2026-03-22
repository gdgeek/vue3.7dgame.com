# 实施任务

## 任务 1：创建 Nginx 配置模板（nginx.conf.template）

- [x] 将现有 `nginx.conf` 重命名为 `nginx.conf.template`
- [x] 在 `server` 块中、静态资源缓存 location 之前，新增 `/api/` 反向代理 location 块：
  - `proxy_pass ${APP_API_URL}/;`（尾部斜杠实现路径剥离）
  - 标准请求头：`Host`、`X-Real-IP`、`X-Forwarded-For`、`X-Forwarded-Proto`
  - WebSocket 支持：`proxy_http_version 1.1`、`Upgrade`、`Connection`
  - 超时配置：connect 60s、read 120s、send 120s
  - `client_max_body_size 50m`
- [x] 新增 `/api-backup/` 反向代理 location 块（同上，`proxy_pass ${APP_BACKUP_API_URL}/;`）
- [x] 新增 502/503/504 自定义 JSON 错误响应
- [x] 保留现有 Gzip、缓存策略、`try_files` 回退等配置不变

**验收需求：** 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4

## 任务 2：重写 docker-entrypoint.sh

- [x] 移除旧的 `sed` 替换 JS 文件中 `{scheme}//api.{domain}`、`{scheme}//auth.{domain}`、`https://rodin.01xr.com` 的逻辑
- [x] 新增 `envsubst` 命令，将 `${APP_API_URL}` 和 `${APP_BACKUP_API_URL}` 注入 nginx 配置模板，生成 `/etc/nginx/conf.d/default.conf`
- [x] 保留 `window.__*` 全局变量注入 `index.html` 的逻辑（用于 failover）
- [x] 添加启动日志输出（打印注入的环境变量值）
- [x] 保留 `exec nginx -g 'daemon off;'` 启动命令

**验收需求：** 2.1, 2.2, 2.3, 2.4, 3.7

## 任务 3：更新 environment.ts（移除占位符机制）

- [x] 移除 `import { GetIP, ReplaceIP, ReplaceURL } from "./utils/helper"` 导入
- [x] `api` 属性：生产环境返回 `"/api"`，开发环境返回 `import.meta.env.VITE_APP_API_URL`
- [x] `backup_api` 属性：生产环境返回 `"/api-backup"`，开发环境返回 `import.meta.env.VITE_APP_BACKUP_API_URL`
- [x] `domain_info`：生产环境使用 `window.__DOMAIN_INFO_API_URL__` 回退到 Vite 环境变量，开发环境直接用 Vite 环境变量
- [x] `domain_info_backup`：同上逻辑
- [x] `doc`、`blockly`、`editor`：移除 `ReplaceURL` 包装，直接使用环境变量值
- [x] 移除 `ip` 属性、`replaceIP` 方法、`auth_api` 属性
- [x] 确保所有使用 `environment.ip`、`environment.replaceIP`、`environment.auth_api` 的地方已无引用（前序任务已清理）

**验收需求：** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

## 任务 4：更新 .env.production

- [x] 将 `VITE_APP_API_URL` 改为 `"/api"`
- [x] 新增 `VITE_APP_BACKUP_API_URL="/api-backup"`
- [x] 移除 `VITE_APP_AUTH_API`（已无使用）
- [x] 移除 `VITE_APP_A1_API`（已无使用）
- [x] 将 `VITE_APP_BLOCKLY_URL` 和 `VITE_APP_EDITOR_URL` 中的 `{domain}` 占位符改为实际域名或保留（这两个不走反向代理，按需处理）
- [x] 移除 `VITE_APP_PASSWORD_API_URL`（已无使用）

**验收需求：** 3.1, 3.2

## 任务 5：更新三个 Dockerfile

- [x] 根目录 `Dockerfile`：将 `COPY nginx.conf` 改为 `COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template`，保留 entrypoint
- [x] `docker/production/Dockerfile`：添加 `COPY docker-entrypoint.sh`、`RUN chmod +x`、改 `CMD` 为 `ENTRYPOINT`，复制模板文件
- [x] `docker/staging/Dockerfile`：同上，添加 entrypoint 支持，复制模板文件

**验收需求：** 6.1, 6.2, 6.3, 6.4

## 任务 6：创建 docker-compose.prod.yml

- [x] 创建 `docker-compose.prod.yml`，包含 `web` 服务定义
- [x] 配置 `build` 指向根目录 Dockerfile
- [x] 配置 `environment`：`APP_API_URL`、`APP_BACKUP_API_URL`、`APP_DOMAIN_INFO_API_URL`、`APP_BACKUP_DOMAIN_INFO_API_URL`
- [x] 配置端口映射 `80:80`
- [x] 配置 `restart: unless-stopped`
- [x] 配置 `healthcheck`（curl localhost）

**验收需求：** 6.5, 6.6, 6.7

## 任务 7：更新 .env.development（补充备用 API 配置）

- [x] 确认 `VITE_APP_BACKUP_API_URL` 已配置（如未配置则添加，指向开发环境备用后端）
- [x] 确认开发环境所有 API URL 为完整地址（无占位符）

**验收需求：** 3.3

## 任务 8：更新现有测试 + 新增配置验证测试

- [x] 更新 `test/unit/utils/request.spec.ts` 中与 environment 相关的 mock（如有）
- [x] 新增 `test/unit/nginx/nginx-config.spec.ts`：读取 `nginx.conf.template` 文件内容，验证：
  - `/api/` 和 `/api-backup/` location 块存在
  - `proxy_pass` 包含 `${APP_API_URL}` 和 `${APP_BACKUP_API_URL}`
  - 标准请求头（X-Real-IP、X-Forwarded-For、X-Forwarded-Proto、Host）存在
  - WebSocket 头（Upgrade、Connection）存在
  - 超时配置正确（connect 60s、read 120s、send 120s）
  - `client_max_body_size` ≥ 50m
  - Gzip 配置保留
  - `try_files` 回退保留
- [x] 新增 `test/unit/nginx/docker-entrypoint.spec.ts`：读取 `docker-entrypoint.sh`，验证：
  - 不包含 `{scheme}`、`{domain}` 的 sed 替换
  - 包含 `envsubst` 命令
- [x] 新增 `test/unit/nginx/dockerfile.spec.ts`：读取三个 Dockerfile，验证包含 nginx.conf 和 entrypoint 相关指令
- [x] 新增 `test/unit/nginx/docker-compose.spec.ts`：读取 `docker-compose.prod.yml`，验证环境变量、端口映射、健康检查
- [x] 运行全部测试确认通过

**验收需求：** 1.4, 1.5, 4.1, 4.2, 5.1-5.5, 6.1-6.7, 7.1-7.3, 3.4, 3.7
