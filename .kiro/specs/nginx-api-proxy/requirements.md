# 需求文档

## 简介

为 Vue 3 + Vite 项目配置 Nginx 反向代理，将前端发出的后端 API 请求通过 Nginx 转发到后端服务。当前项目在生产环境中已使用 Nginx 托管静态文件，但未配置 API 反向代理，前端直接通过完整 URL 调用后端 API（如 `api.{domain}`）。本功能将在 Nginx 层添加反向代理规则，使前端可以通过相对路径（`/api/` 和 `/api-backup/`）访问主备后端服务，解决跨域问题并简化部署配置。同时移除现有的 `{scheme}`、`{domain}`、`{ip}` 占位符替换机制，生产环境直接使用相对路径，开发环境直接写死 URL。

## 术语表

- **Nginx_Proxy**: Nginx 服务器中负责将 API 请求转发到后端服务的反向代理模块
- **Frontend_App**: 基于 Vue 3 + Vite 构建的前端单页应用
- **Backend_API**: 提供 RESTful 接口的主后端服务
- **Backup_API**: 提供 RESTful 接口的备用后端服务（用于 failover 场景）
- **Docker_Container**: 运行 Nginx 和前端静态文件的 Docker 容器
- **API_Prefix**: 用于标识需要反向代理的请求路径前缀（`/api/` 为主 API，`/api-backup/` 为备用 API）
- **Upstream_Server**: Nginx 反向代理的目标后端服务地址
## 需求

### 需求 1：Nginx 反向代理基础配置

**用户故事：** 作为运维人员，我希望在 Nginx 中配置反向代理规则，以便前端 API 请求能够通过 Nginx 转发到后端服务。

#### 验收标准

1. WHEN 前端发送路径以 `/api/` 开头的请求时，THE Nginx_Proxy SHALL 将该请求转发到 Backend_API 对应的 Upstream_Server
2. WHEN 前端发送路径以 `/api-backup/` 开头的请求时，THE Nginx_Proxy SHALL 将该请求转发到 Backup_API 对应的 Upstream_Server
3. THE Nginx_Proxy SHALL 在转发请求时移除路径前缀（`/api/` 或 `/api-backup/`），使后端接收到原始路径
4. THE Nginx_Proxy SHALL 在转发请求时设置 `X-Real-IP`、`X-Forwarded-For` 和 `X-Forwarded-Proto` 标准请求头，以便后端获取客户端真实信息
5. THE Nginx_Proxy SHALL 在转发请求时设置 `Host` 请求头为原始请求的 Host 值

### 需求 2：Upstream 地址动态配置

**用户故事：** 作为运维人员，我希望通过环境变量动态配置主备后端 API 地址，以便在不同部署环境中灵活切换后端服务。

#### 验收标准

1. THE Docker_Container SHALL 支持通过环境变量 `APP_API_URL` 配置 Backend_API 的 Upstream_Server 地址
2. THE Docker_Container SHALL 支持通过环境变量 `APP_BACKUP_API_URL` 配置 Backup_API 的 Upstream_Server 地址
3. WHEN Docker_Container 启动时，THE docker-entrypoint 脚本 SHALL 根据环境变量生成 Nginx 反向代理配置中的 Upstream_Server 地址（包括主 API 和备用 API）
4. IF 环境变量未设置，THEN THE Docker_Container SHALL 使用合理的默认后端地址作为 Upstream_Server

### 需求 3：前端请求路径适配（移除占位符机制）

**用户故事：** 作为前端开发者，我希望前端代码能够通过相对路径调用主备后端 API，并移除现有的 `{scheme}`、`{domain}`、`{ip}` 占位符替换机制，简化环境配置。

#### 验收标准

1. WHILE 应用运行在生产环境中，THE Frontend_App SHALL 使用相对路径前缀 `/api` 作为主 API 基础路径
2. WHILE 应用运行在生产环境中，THE Frontend_App SHALL 使用相对路径前缀 `/api-backup` 作为备用 API 基础路径
3. WHILE 应用运行在开发环境中，THE Frontend_App SHALL 使用写死的完整 URL 调用后端 API（如 `VITE_APP_API_URL` 环境变量中配置的地址）
4. THE environment 模块 SHALL 不再使用 `ReplaceURL`、`ReplaceIP`、`GetIP` 等占位符替换函数处理 API 地址
5. THE environment 模块 SHALL 根据当前运行环境直接返回正确的 API 基础路径（生产环境返回相对路径，开发环境返回 Vite 环境变量中的完整 URL）
6. WHEN 环境切换时，THE Frontend_App SHALL 无需修改业务代码即可适配不同的 API 调用方式
7. THE docker-entrypoint.sh SHALL 移除对 JS 文件中 `{scheme}`、`{domain}` 等占位符的 sed 替换逻辑，因为生产环境不再需要占位符

### 需求 4：WebSocket 代理支持

**用户故事：** 作为前端开发者，我希望 Nginx 反向代理也能支持 WebSocket 连接，以便实时通信功能正常工作。

#### 验收标准

1. WHEN 前端发起 WebSocket 升级请求时，THE Nginx_Proxy SHALL 正确转发 `Upgrade` 和 `Connection` 请求头
2. THE Nginx_Proxy SHALL 为 WebSocket 连接设置合理的超时时间（读超时和发送超时均不少于 60 秒）

### 需求 5：代理超时与错误处理

**用户故事：** 作为运维人员，我希望 Nginx 反向代理具备合理的超时配置和错误处理机制，以便在后端服务异常时提供可预期的行为。

#### 验收标准

1. THE Nginx_Proxy SHALL 设置代理连接超时时间为 60 秒
2. THE Nginx_Proxy SHALL 设置代理读取超时时间为 120 秒
3. THE Nginx_Proxy SHALL 设置代理发送超时时间为 120 秒
4. IF Backend_API 返回 502、503 或 504 错误，THEN THE Nginx_Proxy SHALL 返回自定义错误页面或 JSON 错误响应
5. THE Nginx_Proxy SHALL 为代理请求设置合理的请求体大小限制（不少于 50MB）

### 需求 6：多环境 Docker 配置与生产部署

**用户故事：** 作为运维人员，我希望 production 和 staging 环境的 Dockerfile 都包含反向代理配置，并提供 docker-compose.yml 用于生产部署。

#### 验收标准

1. THE docker/production/Dockerfile SHALL 将包含反向代理规则的 Nginx 配置文件复制到容器中
2. THE docker/staging/Dockerfile SHALL 将包含反向代理规则的 Nginx 配置文件复制到容器中
3. THE 根目录 Dockerfile SHALL 通过 docker-entrypoint.sh 支持动态注入 Upstream_Server 地址
4. WHEN 使用任一 Dockerfile 构建镜像时，THE 构建产物 SHALL 包含完整的反向代理配置
5. THE 项目 SHALL 提供 `docker-compose.prod.yml` 文件用于生产环境部署，包含 Nginx 反向代理服务的完整配置
6. THE docker-compose.prod.yml SHALL 通过 environment 字段暴露 `APP_API_URL`、`APP_BACKUP_API_URL` 等环境变量，便于运维配置
7. THE docker-compose.prod.yml SHALL 配置端口映射、健康检查等生产部署所需的基础设施

### 需求 7：现有功能兼容性

**用户故事：** 作为前端开发者，我希望添加反向代理后不影响现有的静态文件服务、Gzip 压缩和缓存策略。

#### 验收标准

1. THE Nginx_Proxy SHALL 保留现有的 Gzip 压缩配置
2. THE Nginx_Proxy SHALL 保留现有的静态资源缓存策略（JS/CSS 长期缓存、HTML 不缓存）
3. THE Nginx_Proxy SHALL 保留 SPA 路由的 `try_files` 回退机制
4. WHEN 请求路径不匹配任何代理规则时，THE Nginx_Proxy SHALL 按照现有逻辑提供静态文件服务
