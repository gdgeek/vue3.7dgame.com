# 当前任务

## Task 3: 移除 env-config.js 注入管道 — `complete` ✅

### 最终结果（2026-03-22 18:47）
- 所有 API URL 已通过 nginx 反向代理，不再需要 env-config.js 注入
- 已删除：`env-config.js.template`、`docker-envsubst.sh`
- 已清理：`index.html`、`Dockerfile`（3个）、`debug.html`、测试、文档
- CI 通过：run 23401219831 ✅
- Portainer 容器已更新，运行正常
- debug.html 验证结果：
  - `/api/health` → 200 ✅
  - `/api-backup/health` → 200 ✅
  - `/api-domain/api/health` → 200 ✅
  - `/api-domain-backup/api/health` → 200 ✅
  - 无 env-config.js 引用错误 ✅

---

# 历史任务（已完成）

## Task 2: 域名信息 API 反向代理 — `complete` ✅
- `/api-domain/` → `APP_DOMAIN_INFO_API_URL`
- `/api-domain-backup/` → `APP_BACKUP_DOMAIN_INFO_API_URL`
- `src/environment.ts` 已更新

## Task 1: Nginx 反向代理调试 — `complete` ✅
- 根因：`set $backend_api` 变量导致 `$proxy_host` 为空
- 修复：改为 envsubst 静态 proxy_pass
- commit `a1f8e48b`

## 移除 TTS 和 AI Rodin 功能 — `complete`
(289 test files, 4211 tests passed)
