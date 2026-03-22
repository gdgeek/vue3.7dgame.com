# Session Progress

## 2026-03-22: Nginx 反向代理 Host header 修复

### 问题
- `POST https://t.dev.xrugc.com/api/v1/auth/login` 返回 404
- 根因：nginx 使用变量 proxy_pass 时 `$proxy_host` 为空，上游 API 收到错误的 Host header
- 尝试用 `APP_API_HOST` env var 方案，但 docker-entrypoint.d 脚本以子进程运行，export 不传播

### 修复方案
- 去掉 `set $backend_api` 变量中间层，直接用 `proxy_pass ${APP_API_URL}/;`（envsubst 替换后变成静态 proxy_pass）
- `$proxy_host` 自动生效，Host header 正确传递给上游 API
- `docker-envsubst.sh` 简化为只生成 env-config.js

### 部署验证（2026-03-22 18:13）
- Portainer CDN 缓存问题已自动解决，容器成功拉到新镜像
- 新容器 ID: `94cbb23e8f06`，commit `a1f8e48b`，digest `sha256:8061ceec1f26`
- RestartCount=0，Status=running ✅
- `/api/health` → 200 ✅
- `/api-backup/health` → 200 ✅
- `POST /api/v1/auth/login` → 400 `{"message":"username is required"}` ✅（API 正常业务响应，不再是 404）
- `env-config.js` → 200，域名信息 URL 正确注入 ✅
- 反向代理问题完全解决 🎉
