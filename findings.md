# Deployment Debug Findings

## Date: 2026-03-22

## Problem: `https://t.dev.xrugc.com/` 无法访问

### Root Cause
容器 `frontend-dev-test-1` 的 nginx 启动失败，反复崩溃重启。

错误日志：
```
nginx: [emerg] unknown "app_doc_api_url" variable
```

### 原因分析
1. `nginx.conf.template` 中使用了 `${APP_DOC_API_URL}`
2. 但 Portainer stack `frontend-dev` 的 docker-compose 中 `test` 服务没有设置 `APP_DOC_API_URL` 环境变量
3. `NGINX_ENVSUBST_FILTER=APP_` 只替换已存在的 `APP_*` 环境变量
4. 由于 `APP_DOC_API_URL` 不存在，`${APP_DOC_API_URL}` 保留原样在 nginx 配置中
5. nginx 启动时把 `${APP_DOC_API_URL}` 当作 nginx 变量解析，找不到就报错

### Stack 当前环境变量（test 服务）
- ✅ APP_API_URL=https://api.t.xrteeth.com
- ✅ APP_BACKUP_API_URL=https://api.t.tmrpp.com
- ✅ APP_DOMAIN_INFO_API_URL=https://domain.xrteeth.com
- ✅ APP_BACKUP_DOMAIN_INFO_API_URL=https://domain.tmrpp.com
- ❌ APP_DOC_API_URL — 缺失！
- ❌ NGINX_ENVSUBST_FILTER — 缺失（但 Dockerfile 中有默认值 APP_）

### 解决方案
在 Portainer stack 的 docker-compose 中为 `test` 服务添加缺失的环境变量：
```yaml
- APP_DOC_API_URL=https://hololens2.cn/wp-json/wp/v2
```

### 其他发现
- `frontend-dev-web-1`（vue3:develop）IP 也是 `-`，可能也有同样问题
- 容器连接到 `proxy` 网络，Traefik 标签配置正确
- 容器因 nginx 启动失败不断重启（restart: always）
