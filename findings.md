# Nginx 反向代理调研

## plugins-user-management 项目的正确配置（参考）

关键区别：
- 它的 upstream 是 **HTTP** (`http://xrugc-main-api`)，不是 HTTPS
- 它用的是 **静态 proxy_pass**（不是变量），所以 `$proxy_host` 自动生效
- 它用 `proxy_set_header Host $host`（传递客户端请求的 Host）
- 它不需要 `resolver`、不需要 `proxy_ssl_server_name`
- 它的 nginx.conf 是**静态文件**直接 COPY，不是模板

```nginx
location /v1/plugin-user/ {
    proxy_pass http://xrugc-main-api/v1/plugin-user/;
    proxy_set_header Host $host;
}
```

## 我们的情况 vs 参考项目

| 维度 | plugins-user-management | 我们的项目 |
|------|------------------------|-----------|
| upstream 协议 | HTTP | HTTPS |
| upstream 地址 | Docker 内部 DNS 名 | 外部域名 (api.t.xrteeth.com) |
| proxy_pass | 静态 | 变量（需要 resolver） |
| Host header | `$host`（客户端域名） | 需要上游域名（API 按 Host 路由） |
| SNI | 不需要 | 需要 `proxy_ssl_server_name on` |
| envsubst | 不需要 | 需要（URL 从 docker-compose env 注入） |

## 核心问题确认
参考项目不适用于我们的场景，因为：
1. 我们的 upstream 是 HTTPS 外部域名，必须用变量 proxy_pass + resolver
2. 变量 proxy_pass 导致 `$proxy_host` 为空
3. 上游 API 按 Host header 路由，必须传正确的上游域名

## 插件项目 develop 分支的真实配置（关键发现）

插件项目 develop 分支用的是 **nginx.conf.template**，和我们一样：

```nginx
location /v1/plugin-user/ {
    proxy_pass ${API_UPSTREAM}/v1/plugin-user/;
    proxy_set_header Host $proxy_host;
    proxy_ssl_server_name on;
}
```

关键点：
1. **proxy_pass 是静态的**（`${API_UPSTREAM}` 被 envsubst 替换后变成 `https://api.t.xrteeth.com`）
2. **不用 nginx 变量**（没有 `set $var`），所以 `$proxy_host` 正常工作
3. 用 `NGINX_ENVSUBST_FILTER=API_UPSTREAM` 只替换 `API_UPSTREAM`，不影响 `$proxy_host` 等 nginx 变量
4. 自定义 ENTRYPOINT 调用 `exec /docker-entrypoint.sh nginx -g 'daemon off;'`

**这就是我们的 bug 根因**：
- 我们用了 `set $backend_api "${APP_API_URL}"` + `proxy_pass $backend_api/`（nginx 变量 proxy_pass）
- 插件项目直接 `proxy_pass ${API_UPSTREAM}/v1/...`（envsubst 替换后变成静态 proxy_pass）
- nginx 变量 proxy_pass 导致 `$proxy_host` 为空，静态 proxy_pass 则正常

**正确修复方案**：去掉 `set $var` 中间层，直接用 envsubst 替换后的静态 proxy_pass。

## Portainer 部署问题（2026-03-22 18:00+）

容器 inspect 发现：
- `org.opencontainers.image.revision` = `ca7146550de4cae2b162d6d05f6db80c3ff138de`（旧 commit，不是最新的 `a1f8e48b`）
- 容器 RestartCount=15，Status=restarting，ExitCode=1
- nginx 报错：`unknown "app_api_host" variable`（旧版 nginx.conf.template 的残留）
- 说明 Portainer re-pull 拿到的还是旧镜像

CI run 23400438168（commit a1f8e48b）显示 "Build and push Docker image" 成功，但 registry 里的 tag 可能指向的是上一次构建（ca714655，run 23400264677）。
需要确认：最新 CI 推送的 image digest 是否和容器里的 `sha256:a7693eb255ba` 一致。

---

# TTS + AI Rodin 移除 — 调研结果

## AI Rodin 相关文件
| 文件 | 类型 | 说明 |
|------|------|------|
| `src/api/v1/ai-rodin.ts` | API 模块 | 直接使用 VITE_APP_AI_API 的 4 个函数 + 3 个 REST 函数 |
| `src/types/ai-rodin.ts` | 类型定义 | AiRodinQuality, AiRodinQuery, AiRodinItem |
| `src/components/MrPP/AIProcess.vue` | 组件 | 无其他组件引用它 |
| `src/components/MrPP/AIUpload.vue` | 组件 | 无其他组件引用它 |
| `src/environment.ts` | 配置 | `ai` 属性，无代码引用 environment.ai |
| `test/unit/api/ai-rodin.spec.ts` | 测试 | |
| `test/unit/api/v1/ai-rodin.spec.ts` | 测试 | |
| `test/unit/types/ai-rodin.spec.ts` | 测试 | |
| `test/unit/api/vp-wechat-tools.spec.ts` | 测试 | 包含 ai-rodin 的 schedule 和 HTTP 测试 |
| `scripts/fix_catch_blocks.py` | 脚本 | 引用了 AIProcess/AIUpload |
| `docs/AI_FEATURES.md` | 文档 | AI Rodin 和 TTS 文档 |

## TTS 相关文件
| 文件 | 类型 | 说明 |
|------|------|------|
| `src/views/audio/tts.vue` | 页面 | 未在路由注册，死代码 |
| `src/views/audio/composables/useTTS.ts` | composable | 唯一使用 environment.tts_api 的地方 |
| `src/views/audio/composables/useLanguageAnalysis.ts` | composable | 被 tts.vue 使用 |
| `src/views/audio/composables/useVoiceSelection.ts` | composable | 被 tts.vue 使用 |
| `src/views/audio/components/LanguageAnalysis.vue` | 组件 | TTS 子组件 |
| `src/views/audio/components/TTSParams.vue` | 组件 | TTS 子组件 |
| `src/views/audio/components/VoiceSelector.vue` | 组件 | TTS 子组件 |
| `src/views/audio/components/VoiceSelector.stories.ts` | storybook | |
| `src/environment.ts` | 配置 | `tts_api` 属性 |
| `test/unit/composables/audio/useTTS.spec.ts` | 测试 | |
| `test/unit/composables/audio/useLanguageAnalysis.spec.ts` | 测试 | |
| `test/unit/composables/audio/useVoiceSelection.spec.ts` | 测试 | |
| `src/views/audio/composables/__tests__/useTTS.spec.ts` | 测试 | |
| `src/views/audio/composables/__tests__/useLanguageAnalysis.spec.ts` | 测试 | |

## Env 文件
- `.env.development` — VITE_TTS_API_URL
- `.env.staging` — VITE_APP_AI_API, VITE_TTS_API_URL
- `.env.production` — VITE_APP_AI_API, VITE_TTS_API_URL
- `docker-compose.dev.yml` — VITE_APP_AI_API

## 保留
- `src/views/audio/index.vue` — 音频管理列表页（路由中注册）
- `src/views/audio/view.vue` — 音频处理页（路由中注册）
