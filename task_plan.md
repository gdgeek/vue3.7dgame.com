# 工作计划：Nginx 多后端 Failover 负载均衡

## 目标

将当前的双 location（`/api/` + `/api-backup/`）+ 前端 `createFailoverAxios` 主备切换方案，改为 Nginx 层面的多后端 failover 方案。前端只暴露一个 `/api/` 路径，Nginx 内部通过 `error_page` + 命名 location 链式 failover 到多个备用后端。后端数量通过编号环境变量（`APP_API_1_URL`、`APP_API_2_URL`...）动态配置。

## 背景

- 两个后端域名不同（`api.xrteeth.com` / `api.tmrpp.com`），且都依赖 Host 头（错误 Host 返回 404）
- 不能用 Nginx upstream 池子（无法按 server 动态设置 Host 头）
- 当前用 nginx 官方镜像的 envsubst 模板机制（`/etc/nginx/templates/`），没有自定义 entrypoint
- 需要改为自定义 `docker-entrypoint.sh`，动态解析编号环境变量生成 nginx 配置

## 涉及文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `docker-entrypoint.sh` | 新建 | 解析 `APP_API_N_URL` 环境变量，动态生成 nginx failover 配置 |
| `nginx.conf.template` | 修改 | 移除 `/api/` 和 `/api-backup/` 的静态 location，改为占位符 `# __API_LOCATIONS__` |
| `Dockerfile` | 修改 | 添加 COPY entrypoint，设置 ENTRYPOINT |
| `docker/production/Dockerfile` | 修改 | 同上 |
| `docker/staging/Dockerfile` | 修改 | 同上 |
| `docker-compose.prod.yml` | 修改 | 环境变量改为编号格式 |
| `docker-compose.dev.yml` | 修改 | 开发环境适配 |
| `src/environment.ts` | 修改 | 移除 `backup_api`，简化为只有 `/api` |
| `src/utils/request.ts` | 修改 | 不再使用 `createFailoverAxios`，改为普通 `axios.create` |
| `src/utils/failover.ts` | 可选保留 | `domain-query.ts` 仍在用，但主 API 的 failover 可以移除 |
| `src/api/domain-query.ts` | 修改 | 域名信息 API 也可以走 Nginx failover |
| `.env.production` | 修改 | 移除 `VITE_APP_BACKUP_API_URL` |
| 测试文件 | 修改 | 适配新的配置结构 |

## 阶段

### 阶段 1：Nginx 层 — 自定义 entrypoint + 动态配置生成 `[complete]`

1.1 创建 `docker-entrypoint.sh`
  - 遍历 `APP_API_1_URL`、`APP_API_2_URL`... 编号环境变量
  - 自动从 URL 提取 Host（如果没有配 `APP_API_N_HOST`）
  - 生成链式 failover location 块：
    - 第一个 → `location /api/`（主，`proxy_connect_timeout 5s` 快速失败）
    - 后续 → `location @api_backup_N`（命名 location，链式 `error_page`）
    - 最后一个不设 `error_page`（兜底）
  - 用 `sed` 将生成的 location 注入 nginx 模板的 `# __API_LOCATIONS__` 占位符
  - 同时处理其他 `APP_` 环境变量的 envsubst（域名信息、文档等）
  - 最后 `exec nginx -g 'daemon off;'`

1.2 修改 `nginx.conf.template`
  - 移除现有的 `/api/` 和 `/api-backup/` location 块
  - 在对应位置添加 `# __API_LOCATIONS__` 占位符
  - 保留其他 location（`/api-doc/`、`/api-domain/`、`/api-domain-backup/`、静态文件、缓存等）

1.3 修改三个 Dockerfile
  - COPY `docker-entrypoint.sh` 到容器
  - `RUN chmod +x /docker-entrypoint.sh`
  - 设置 `ENTRYPOINT ["/docker-entrypoint.sh"]`
  - 不再依赖 nginx 官方镜像的 envsubst 模板机制（因为我们自己处理）

### 阶段 2：Docker Compose 配置 `[complete]`

2.1 修改 `docker-compose.prod.yml`
  ```yaml
  environment:
    - APP_API_1_URL=https://api.xrteeth.com
    - APP_API_2_URL=https://api.tmrpp.com
    # 如需更多备用：
    # - APP_API_3_URL=https://api.backup3.com
    - APP_DOMAIN_INFO_API_URL=https://domain.xrteeth.com
    - APP_BACKUP_DOMAIN_INFO_API_URL=https://domain.tmrpp.com
    - APP_DOC_API_URL=https://hololens2.cn/wp-json/wp/v2
  ```

2.2 修改 `docker-compose.dev.yml`（开发环境不走 Nginx failover，保持直连）

### 阶段 3：前端代码简化 `[complete]`

3.1 修改 `src/environment.ts`
  - 移除 `backup_api` 属性
  - `api` 生产环境保持 `/api`
  - 移除 `auth_api`（和 `api` 相同，直接用 `api`）

3.2 修改 `src/utils/request.ts`
  - 不再使用 `createFailoverAxios`
  - 改为普通 `axios.create({ baseURL: env.api, ... })`
  - 保留所有请求/响应拦截器（token 刷新、错误处理等）

3.3 评估 `src/utils/failover.ts`
  - `src/api/domain-query.ts` 也在用 `createFailoverAxios`
  - 域名信息 API 已有 Nginx failover（`/api-domain/` + `/api-domain-backup/`）
  - 如果域名信息也改为 Nginx 层 failover，则 `failover.ts` 可以完全移除
  - 否则保留给 `domain-query.ts` 使用

3.4 修改 `.env.production`
  - 移除 `VITE_APP_BACKUP_API_URL`

3.5 修改 `.env.development`
  - 保持 `VITE_APP_API_URL`（开发环境直连，不走 Nginx）

### 阶段 4：测试适配 `[complete]`

4.1 修改 `test/unit/nginx/nginx-config.spec.ts`
  - 适配新的模板结构（占位符 + 动态生成）
  - 测试 entrypoint 脚本的输出

4.2 修改 `test/unit/utils/request.spec.ts`
  - 移除 failover 相关测试
  - 测试普通 axios 实例

4.3 修改 `test/unit/nginx/docker-compose.spec.ts`
  - 适配新的环境变量格式

4.4 评估 failover 相关测试文件是否需要保留或删除

### 阶段 5：文档更新 `[complete]`

5.1 更新 `docs/deployment-guide.md`
  - 说明新的环境变量格式
  - 说明如何添加更多备用后端

5.2 更新 spec 文档（如需要）

## 关键设计决策

1. **entrypoint 脚本用 sh 而非 bash**：alpine 镜像没有 bash，用 POSIX sh 兼容
2. **Host 自动提取**：从 URL 自动提取 Host，不需要额外配 `APP_API_N_HOST`（除非需要覆盖）
3. **主 API 快速失败**：`proxy_connect_timeout 5s`，让主挂了时快速切备用
4. **保留 GEEK 自定义头**：所有生成的 location 块都包含 X-GEEK-* 头
5. **保留 WebSocket 支持**：所有生成的 location 块都包含 Upgrade/Connection 头
6. **保留 SNI**：所有 HTTPS 上游都设置 `proxy_ssl_server_name on`

## 风险与注意事项

- `error_page` 链式 failover 是请求级别的，每个请求独立判断，不像前端 failover 那样"切过去就一直用备用"
- 如果主后端间歇性故障（偶尔 502），每个请求都会先尝试主再切备用，增加延迟
- 建议备用后端不超过 3 个，否则链式 failover 延迟累积明显
- alpine 的 sh 不支持数组，entrypoint 脚本需要用 `eval` 或 `while` 循环处理编号变量
