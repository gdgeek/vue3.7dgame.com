# WorkBuddy P0 隔离本地验收环境

本文件记录 2026-09-16 建立的临时验收环境、启停方式与边界。2026-09-17 已通过 WorkBuddy P0 场景读取、暂存、页面确认、保存回执与刷新读回；详细证据、限制和未测项目见 [兼容验收记录](./webmcp-dev-acceptance.md) 和 [本轮非秘密证据](./evidence/workbuddy-p0-20260917.json)。这一结果仅覆盖下述隔离本地环境。

环境来源为本机 `/tmp/xrugc-webmcp-p0-20260916/README.md` 和 `/tmp/xrugc-webmcp-preview.mjs`。这些临时文件与构建目录可能被系统清理，本文不包含密钥、密码、注册令牌或完整私有配置。

## 版本与访问入口

| 部分       | 本轮使用的版本或入口                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 前端       | `web` HEAD `c9a5fbd0` 加本次未提交改动；界面版本 `v2026.09.16-2309`                                                      |
| 前端构建   | `/tmp/xrugc-webmcp-enabled-build`，构建时间 23:11:01；启用 `VITE_WEBMCP_DEV_ENABLED=true` 的 development 构建            |
| 网站预览   | `http://127.0.0.1:3102/`；登录入口 `/site/login`                                                                         |
| Editor     | `b6b5027` 加既有未提交改动，TypeScript 编译已通过；`node server.js` 提供 `http://127.0.0.1:3002/`                        |
| 业务 API   | `http://127.0.0.1:8191`，容器 `xrugc-webmcp-p0-api`，镜像 `driver-api`                                                   |
| API 源码   | `/private/tmp/xrugc-webmcp-p1-http-recovery-20260913`，提交 `966514522fc1236da24c721a40c98dd216da32f6`，包含真实 P1 接口 |
| 桌面客户端 | WorkBuddy 5.5.2                                                                                                          |
| 浏览器     | Chrome 152.0.7977.83                                                                                                     |
| 本机桥接   | npm `@jason.today/webmcp@0.1.13`；其发布包 MCP 元信息仍报告 `0.1.12`                                                     |

仓库默认 `VITE_WEBMCP_DEV_ENABLED=false` 保持不变，本环境没有发布生产。前端仍是固定构建快照；修改源码后不会自动反映到该预览，需要重建并更新验收版本记录。

## 本轮业务证据的范围

在 scene `665`、meta `1090`、测试 user `896` 中，实例 `d17d2e3a-db87-4f52-b9a3-734b8475aa09` 的 x 从 `0` 改为 `0.25`，其他 transform 字段与 meta 不变。operation 为 `357200bb-58f6-41cc-86b1-81083d06f980`；complete 在 331 ms 内返回 awaiting_confirmation，页面确认至少等待 47 秒后由 Codex 按用户授权点击。数据库已核对本 operation 仅 1 次写入，保持 `notpublished`、snapshot `0`。

刷新后的页面已重新配对，WorkBuddy 重新发现 28 个工具并读回同一操作的 completed 回执、位置 `(0.25, 0, 0)`、ready=true、dirty=false、published=false，回执版本与场景版本一致。这里不将重复提交、取消、HTTP 409、四类编辑页或跨入口幂等列为实测通过。恢复配对曾发生第一个新令牌被拒绝、第二次恢复；上游令牌表整文件覆盖存在竞态可能，但本次唯一根因未证实。

验收结束已主动断开网页 AI 会话，保留测试场景标签页、WorkBuddy 连接器配置与本地服务。继续试用时需要获取新令牌配对；停止服务见下文。

回执复核时 WorkBuddy 还曾违反 MCP-only 限制，调用本地 ls/mkdir 并写入任务记忆，Codex 停止该回合后重新约束。该客户端行为已单独审计；不将它混作网站保存失败或额外兼容能力。详见兼容验收记录，不在本文复制记忆内容、注册令牌或凭据。

## 后端隔离与预览配置

API 源码及其已解析的 vendor 分别只读挂载，运行时、控制台运行时和 Web assets 使用 tmpfs。数据库是现有 `driver-db-1` 内独立的 `xrugc_webmcp_p0_20260916`，使用专属数据库用户；建立时仅复制 66 张源表的定义，没有复制源数据。

仅应用既有迁移 `m260911_230000_add_webmcp_write_receipts`，通过 `web-mcp-p1-migrate/up 1` 执行，再次检查返回 `ALREADY_APPLIED`。Redis 使用专属容器 `xrugc-webmcp-p0-redis`，不持久化、不映射宿主端口。认证使用真实用户名/密码、SessionService、Redis refresh token 和 ES256 JWT，没有测试认证绕过。EC 密钥在 API 容器内新建。

API CORS 允许 localhost/127.0.0.1 的 3001 和 3102 端口。`/p0-assets/` 通过 Apache Alias 读取环境目录的 `public/`，仅提供测试素材公开读取，不启用目录列表。当前 API 源码仍保留旧 DomainController，但前端使用静态域名配置；没有重建已被迁移移除的 domain 表。

临时预览脚本仅做本机测试站点配置：

- 提供已有构建文件，并把 `/api` 代理到 `127.0.0.1:8191`、把 `/api-config` 代理到已有 `127.0.0.1:8088`；分别剥离对应前缀，不返回伪造业务响应。
- 在页面模块之前载入 `/__env.js`，设置 `EDITOR_URL=http://127.0.0.1:3002/`。
- 对 `/config/domains/dev.xrugc.com.json` 和 `/config/domains/d.dev.xrugc.com.json` 返回构建内原有合法开发站品牌配置，仅将 `homepage` 设为 `http://127.0.0.1:3102/`。品牌字段不变，防止本机首页流程跳往外部开发站。该覆盖只存在于临时服务器响应，不修改仓库配置或构建文件。

## 使用、停止与再次启动

先检查本轮创建的容器；不要操作其他环境的容器：

```bash
docker ps -a --filter label=xrugc.task=webmcp-p0-20260916
```

已创建容器停止后，可按顺序启动专属 Redis 和 API：

```bash
docker start xrugc-webmcp-p0-redis
docker start xrugc-webmcp-p0-api
```

在独立终端启动前端预览：

```bash
WEBMCP_PREVIEW_PORT=3102 node /tmp/xrugc-webmcp-preview.mjs
```

另开终端，从超级项目根目录启动已编译的 Editor：

```bash
cd plugins/editor.7dgame.com
HOST=127.0.0.1 PORT=3002 node server.js
```

如果这些服务已由本次任务启动，不要重复启动。需要重新编译 Editor 时在其目录执行 `npm run build`，之后记录实际源码状态；既有未提交改动属于本次环境的一部分，不能误标为纯提交产物。

访问本机网站后使用该隔离环境的测试账号登录，再按 [接入说明](./webmcp-dev.md) 在 WorkBuddy 获取新注册令牌并配对。账号材料仅保存在本机私有目录，不得复制进仓库、日志或验收报告。预览的 `/api/v1/system/deployment` 可用于检查实际代理是否到达 API；成功响应不代替完整编辑保存验收。

停止预览和 Editor 时，在各自启动终端按 **Ctrl-C**，避免按历史 PID 终止其他进程。仅停止本环境两个自建容器：

```bash
docker stop xrugc-webmcp-p0-api xrugc-webmcp-p0-redis
```

**不要停止 `driver-db-1`，不要修改 `bujiaban` 数据库。** 本说明不包含数据库删除命令。再次启动依赖临时配置目录、只读源码和 vendor 挂载仍存在；Redis/tmpfs 状态不保证跨停止保留，恢复后应核对 API 健康、重新登录并重新配对，而不是继续复用旧浏览器认证或桥接会话。

## 已知限制与验收边界

- 原本地 API `localhost:8091` 环境使用 `server` 的 `87313dc3`，缺少 P1 支持且 `bujiaban_test` 不存在，因此建立了上述隔离环境。它与线上开发环境不是同一部署。
- 原 Vite 开发服务出现依赖优化产物的 Vue 初始化顺序错误：图标组件执行 `defineComponent` 时 `isFunction` 尚未初始化，页面空白。已在独立模块导入中复现；本轮采用已成功构建的预览，未修改无关 Vite 源配置或业务源码来绕过。
- 默认关闭的生产构建与开关开启的开发构建均通过，存在既有组件命名和包大小警告。构建通过不能证明浏览器、业务后端或 WorkBuddy 工作流通过。
- WorkBuddy 与独立只读协议页的双入口调用，以及 Chrome 同源标签锁验证，是协议证据；该协议页未接业务或认证，不能复用其成功结果作为此环境的场景保存结论。
- 本环境有专属数据库和 Redis，但仍使用现有数据库容器、已有 8088 配置服务，以及带既有改动的 Editor。验收时记录实际前后端版本、场景 ID、操作 ID 和刷新读回结果，不能声称完全独立部署。
