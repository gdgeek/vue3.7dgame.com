# 首页自刷新问题复盘与防回归清单

## 背景

2026-05-31，访问 `https://www.bujiaban.com/?lang=zh-CN` 时页面持续刷新。服务端 `HEAD` 响应为 `200 OK`，不是 Nginx 301/302 循环，而是前端路由和页面挂载逻辑互相触发导致的 SPA 级跳转循环。

最终修复提交：

- `web`: `660ec929 fix: prevent self homepage redirect loop`
- `xrugc-platform`: `afa5ad3 chore: update web homepage redirect fix`

## 触发链路

循环链路如下：

1. 用户访问根路径 `/?lang=zh-CN`。
2. 根路由 `/` 重定向到 `/home`，再落到 `/home/index`。
3. 用户未登录，权限守卫把非白名单私有页面跳到 `/web/index?redirect=...`。
4. `/web/index` 挂载后读取 `domainStore.homepage`，执行 `window.location.href = homepage`。
5. `bujiaban.com` 的 `homepage` 配置为 `https://www.bujiaban.com/`，又回到第 1 步。

相关位置：

- `src/router/index.ts`: 根路由 `/` 的默认重定向。
- `src/plugins/permission.ts`: 未登录用户跳到 `/web/index?redirect=...`。
- `src/views/web/index.vue`: 公开首页挂载时跳转 `domainStore.homepage`。
- `public/config/domains/*.json`: 白牌域名的 `default_config.homepage`。

## 根因

`homepage` 原本用于把主系统公开首页跳到外部官网或白牌首页，但没有防护“目标就是当前站点根路径”的情况。对于 `www.bujiaban.com`，`homepage` 指向同站点根路径，于是公开首页组件把用户送回根路径，权限守卫又把用户送回公开首页，形成循环。

额外注意：域名配置会被 cookie 缓存。即使后来把 JSON 配置改对，部分浏览器仍可能带着旧 `homepage` 配置继续触发问题。所以防回归不能只靠改配置，还需要代码侧防护。

## 修复原则

当公开首页准备跳转到 `domainStore.homepage` 时，必须先判断目标是否为当前站点根路径：

- 如果是当前站点根路径，跳过硬跳转，让 `/web/index` 正常展示。
- 如果是其他 origin 或其他路径，才执行 `window.location.href`。

当前防护入口：

- `src/utils/homepageRedirect.ts`
  - `buildHomepageRedirectUrl`
  - `pointsToCurrentSiteRoot`
- `src/views/web/index.vue`
  - 调用 `pointsToCurrentSiteRoot(homepageUrl)` 后再决定是否跳转。
- `test/unit/utils/homepageRedirect.spec.ts`
  - 覆盖同站根路径、跨域、同域非根路径三种情况。

## 以后改首页/白牌配置时必须检查

修改 `public/config/domains/*.json` 的 `default_config.homepage` 前，先确认：

- `homepage` 是否真的要跳到外部官网或独立白牌首页。
- `homepage` 是否等于当前站点 origin 的根路径，例如 `https://www.bujiaban.com/`。
- 如果同站点根路径只是为了 SEO 或展示名称，不要配置为 `homepage`，应保留为空字符串。
- 如果必须配置同站点 URL，确认 `pointsToCurrentSiteRoot` 的单测覆盖目标形态。

修改路由或权限守卫前，先确认：

- 未登录用户访问 `/`、`/home`、`/home/index` 的最终落点是否稳定。
- `/web/index` 是否仍在白名单中。
- `redirect` query 参数是否会携带 `lang`、`theme` 后再次进入根路径。

修改公开首页挂载逻辑前，先确认：

- 不要在 `onMounted` 中无条件 `window.location.href`。
- 对同站点跳转优先使用 router，只有跨站或明确离开 SPA 时才用硬跳转。
- 硬跳转前必须有“目标不是当前页面/当前站点根路径”的保护。

## 排查同类问题的步骤

先判断是不是服务端重定向：

```bash
curl -I 'https://www.bujiaban.com/?lang=zh-CN'
```

如果响应是 `200 OK`，但浏览器仍持续刷新，继续看前端行为：

```bash
curl -L 'https://www.bujiaban.com/?lang=zh-CN'
```

检查 HTML 中入口脚本 hash，例如：

```html
<script type="module" crossorigin src="/js/index.C92zR8PM.js"></script>
```

然后用浏览器观察 5 到 10 秒内 URL 是否在以下形态之间来回变化：

- `/?lang=zh-CN`
- `/web/index?redirect=%2Fhome%2Findex%3Flang%3Dzh-CN&lang=zh-CN&theme=modern-blue`

如果出现这个链路，优先检查 `homepage` 自跳转和权限守卫。

## 上线验证清单

本地验证：

```bash
corepack pnpm vitest run test/unit/utils/homepageRedirect.spec.ts
corepack pnpm run type-check
corepack pnpm run build
```

推送后确认 CI：

```bash
gh run list --repo gdgeek/vue3.7dgame.com --limit 6
gh run list --repo 7dgame-com/xrugc-platform --limit 6
```

确认线上已经换包：

```bash
curl -I 'https://www.bujiaban.com/?lang=zh-CN'
curl -L 'https://www.bujiaban.com/?lang=zh-CN' | rg 'index\.|__env'
```

必须确认：

- `Last-Modified` 晚于本次发布。
- 入口 JS hash 已变化。
- 浏览器打开后 10 秒内 URL 不再循环。
- 页面 title 和正文能稳定显示，例如“不加班AR创作平台”。

## CI 绿了不等于生产已更新

`web/.github/workflows/ci-cd.yml` 当前做的是：

1. 安装依赖、类型检查、lint、测试、覆盖率。
2. 构建并推送 Docker 镜像到镜像仓库。

它不会自动 SSH 到生产机执行拉镜像和重启容器。因此：

- CI 全绿表示代码可构建，镜像已推送。
- 线上 HTML 仍可能是旧容器里的旧静态文件。
- 如果 `curl -I` 的 `Last-Modified` 仍是旧时间，说明生产容器还没换包。

遇到这种情况，需要在生产环境拉取新镜像并重启 web 容器。重启后再用上述线上验证清单确认。

## 防回归要求

以后涉及以下任一改动，都必须补充或更新单测：

- `src/utils/homepageRedirect.ts`
- `src/views/web/index.vue` 中的 homepage 跳转逻辑
- `src/plugins/permission.ts` 中的未登录跳转逻辑
- `public/config/domains/*.json` 中的 `default_config.homepage`

最低测试要求：

- 同站点根路径不会触发硬跳转。
- 跨域 homepage 仍保留并追加合法 `lang`。
- 同域非根路径不被误判为当前站点根路径。
- 不合法语言不会被写入 homepage URL。
