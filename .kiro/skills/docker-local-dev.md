---
inclusion: auto
---

# 本地开发运行规范

## 本地开发

```bash
pnpm dev
```

访问地址：`http://localhost:3001`

支持 HMR 热更新，改代码后自动刷新。

## Docker Compose（模拟生产环境）

如需测试生产构建效果，使用 Docker Compose：

```bash
docker compose -f docker-compose.test.yml up --build -d
```

访问地址：`http://localhost:8088`

`docker-compose.test.yml` 已配置 volume 挂载 `./dist`，可通过 `pnpm run build` 更新内容后刷新浏览器查看，无需重新 docker build。

### 修改后端 API 地址

编辑 `docker-compose.test.yml` 中的 environment 部分：

```yaml
environment:
  - VITE_APP_API_URL=https://api.your-domain.com
  - VITE_APP_AUTH_API=https://auth.your-domain.com
  - VITE_APP_AI_API=https://ai.your-domain.com
```

### 原理

`docker-entrypoint.sh` 在容器启动时用 sed 替换构建产物中的占位符。不传环境变量则由浏览器端 `ReplaceURL()` 根据当前域名动态拼接。
