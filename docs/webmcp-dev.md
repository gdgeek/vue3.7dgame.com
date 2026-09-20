# webmcp.dev 与 WorkBuddy 试用接入

平台提供可选的 webmcp.dev 适配层，让本机 stdio MCP 客户端调用当前网页的工具。它与原生 `document.modelContext` 共用工具、权限、草稿、人工确认和操作回执，不增加业务后端或插件接口。

2026-09-17 已通过 **WorkBuddy P0 本地场景流程**：在隔离后端与真实编辑器中完成工具发现、读取、暂存位置修改、页面确认、保存回执和刷新读回。WorkBuddy 5.5.2、Chrome 152.0.7977.83 与固定桥接版本的结果见 [验收记录](./webmcp-dev-acceptance.md)；环境启停见 [P0 本地环境](./workbuddy-p0-local-environment.md)。

本结论适用于单个场景代表流程。四类编辑页、真实冲突与取消、跨入口重复提交等试用验收尚未完成，默认功能开关保持关闭，未发布生产。另发现客户端曾超出 MCP-only 指令写入本地任务记忆，以及刷新后的首次新令牌配对失败、再次生成后恢复；具体限制与证据已记录。

## 启用与配对

需要当前平台配套的前后端、Editor/Blockly、Node.js 24.x、Chrome 安全上下文，以及能够启动本地 stdio MCP 的 WorkBuddy。保存验收仍依赖现有 P1 后端操作回执与版本接口，参见 [WebMCP 可靠性说明](./webmcp-reliability.md)。

功能开关 `VITE_WEBMCP_DEV_ENABLED` 默认 `false`；缺少变量也视为关闭。本地开发或开发验收构建中可开启，在 `web/` 目录运行：

```bash
VITE_WEBMCP_DEV_ENABLED=true pnpm dev
```

也可以在不提交的 `.env.development.local` 中设置该变量。修改 Vite 环境变量后需要重启开发服务；它是构建时开关，已部署的静态站点需要重新构建才能更改。生产配置保持关闭。

1. 在 WorkBuddy 中添加本地 stdio MCP，使用 [固定版本配置示例](./examples/workbuddy-webmcp.json)。5.5.2 已实际验证的配置入口为 `Experts · Skills · Connectors → Connectors → Custom connectors → Configure MCP`，保存位置为用户目录下的 `.workbuddy-ai/mcp.json`。将示例中的单个服务合并到已有 `mcpServers`，保留其他连接器。命令为 `npx`，参数为 `-y @jason.today/webmcp@0.1.13 --mcp`；不使用 `latest`。若桌面应用找不到 `npx`，将命令替换为本机实际可执行文件的绝对路径。字段依据 [WorkBuddy 官方连接器文档](https://open.workbuddy.cn/docs/connector)。
2. 让 WorkBuddy 调用桥接内置的 `_webmcp_get-token`，复制返回的一次性连接令牌。
3. 在 Chrome 中登录平台并打开场景、实体或脚本编辑页，从用户菜单打开“AI 工具连接”，粘贴令牌并连接。不同导航布局均提供该入口。
4. 等待状态为“已连接”。客户端通过两个固定入口查询当前页面能力；弹窗中的工具数量显示当前业务工具数量，未进入编辑页时可以为零。
5. 关闭弹窗不会断开连接。结束使用时点击“断开连接”；刷新网页后需要重新生成令牌配对。

注册令牌已被使用、桥接重启或重连失败时，重新调用 `_webmcp_get-token`。同一桥接上新生成的注册令牌会替换旧的未使用令牌，请使用最后一次生成的令牌。P0 中刷新后首次新令牌曾被拒绝，再次生成后配对成功；出现该情况时获取新令牌重试，不重复提交场景保存。上游令牌表覆盖竞态仅为可能原因，本次未修改桥接。

## WorkBuddy 实测排错（P1）

- 长对话持续累积完整工具 schema 后，5.5.2 曾停留在“Compressing context”。停止本次生成、保留操作 ID，使用简短任务继续；在取得回执前不要重试写入。
- 重启客户端或换到新任务后，如果 ToolSearch 只能找到桥接的 get-token/define-mcp-tool，即使网页仍显示连接，也应先断开旧连接，用当前任务生成的新令牌重新配对，再重新搜索站点工具。**不要调用 define-mcp-tool**；网页负责注册两个固定入口。一次实测中客户端错误调用了 define-mcp-tool，随后纠正并重新配对。
- 工具原始回执优先于客户端总结。P1 曾出现原始 awaiting_confirmation 但客户端文字声称“已经保存”的矛盾表述；这属于客户端错误，不能据其总结认定保存成功。只有服务器 writeReceipt 的 completed、匹配操作 ID 与 server_acknowledged 才能证明写入落库；partial 的原始业务状态仍保留。
- 原生桌面输入曾反复延迟，产生重复草稿；发送前核对正文，出现输入无响应时不要反复点击发送。此限制与网站 WebSocket 调用延迟应分开记录。

建议在每个新的验收任务开头给出以下约束，并按单个对象分段执行：

```text
仅使用 xrugc-webmcp-dev 的 MCP 工具（允许工具搜索），不使用终端、文件、记忆或浏览器自动化。
不要定义工具。配对后先搜索站点的 list_tools/call_tool，参数只使用返回的 schema。
只操作指定测试对象，先读取再暂存；complete 只调用一次，等待网页确认。
awaiting_confirmation 表示尚未确认保存，不能写“已保存”。
确认后按原 operationId 查询回执；网络中断或 partial/unknown 时先查回执，绝不直接重试提交。
切换编辑页或脚本抽屉后重新 list，遇到 stale_context 先重新发现，再读取新页面对象。
```

完整 P1 状态和已知未完成项见 [P1 验收](./workbuddy-p1-acceptance.md)。

## 工具调用合同

| 固定入口                  | 输入                                                        | 返回与约束                                                   |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| `xrugc_webmcp_list_tools` | `{}`                                                        | 当前工具名称、说明、完整 `inputSchema` 与 `contextToken`     |
| `xrugc_webmcp_call_tool`  | `{ "contextToken": "…", "toolName": "…", "arguments": {} }` | 按当前工具 schema 验证后执行，返回 MCP 文本内容中的完整 JSON |

实际 stdio 工具名称由上游添加网页 host 前缀，例如在 `http://localhost:3001` 中为 `localhost_3001-xrugc_webmcp_list_tools` 和 `localhost_3001-xrugc_webmcp_call_tool`。应使用 MCP 工具列表实际返回的名称。

页面工具集合、编辑会话或登录身份变化会更新 `contextToken`。客户端收到 `stale_context` 后重新查询，不能复用旧参数直接操作新场景。脚本抽屉打开时场景工具暂停，关闭后恢复；无原生 WebMCP API 时仍可先打开编辑页，稍后连接并发现工具。

典型流程为：查询当前工具 → 读取工作区上下文并等待 `ready=true` → 暂存修改 → 提交确认请求 → 用户在网页确认 → 用原 `operationId` 调用 `xrugc_get_operation_status` → 核对完成状态与保存回执。每一步业务工具的参数都以发现结果的 schema 为准。

`awaiting_confirmation`、`partial`、`unknown` 不等于保存成功。桥接调用不等待用户长时间确认，已有操作注册器先返回操作 ID；随后查询回执。断线不撤回已提交的保存，也不自动重放请求。出现异常、超时或冲突时，先查询已有操作和当前状态，再决定后续操作。协议/参数/执行异常使用 `isError`；业务状态保留原义。

## 连接与生命周期边界

- 网页只接受 `ws://` 或 `wss://` 的 `localhost`、`127.0.0.1`、`[::1]` 回环地址，拒绝远端主机、URL 用户信息、额外路径、查询串和片段。平台 JWT 不进入桥接协议。
- 网页适配层只在当前页面内存中保存桥接令牌，不写浏览器持久存储或应用日志。该保证不涵盖 WorkBuddy 聊天记录及第三方桥接；上游 `0.1.13` 会在本机 `~/.webmcp` 保存授权数据，其原始注册日志也可能包含令牌。本次未修改上游。
- Web Locks 保证**同源**标签页仅一个连接。其他标签页收到已有连接提示；不支持 Web Locks 时拒绝连接。不同源不共享该锁，因此本期只支持一个网站标签页、一个 WorkBuddy 客户端连接同一桥接。
- 网页端限制目标为回环地址，不代表上游守护进程仅监听回环接口；上游原始监听代码未显式指定绑定地址。
- 连接只在注册 channel、会话 welcome 和两条工具注册回执均匹配后成功。握手超时为每阶段 10 秒；没有自动重连或调用重放。
- 断线后可点击“重新连接”复用内存会话。上游在 channel 无连接约 60 秒后清理工具与授权，超过这一窗口通常需要新令牌；这不是长期恢复会话保证。
- 点击断开、刷新、退出登录、登录失效或账号变化会清除网页会话；账号变化还会撤销旧工具，需重新载入编辑页。正常 access token 刷新不影响连接。
- 原生入口和兼容入口执行同一个工具回调及操作状态，不创建第二套草稿；页面卸载、iframe 更换以及同名工具替换都会让旧回调失效。

## 检查与维护

固定验证对象为 npm `@jason.today/webmcp@0.1.13` 的已发布包。该包实际 `initialize.serverInfo.version` 仍返回 `0.1.12`，是上游 bundle 元信息，不据此判断安装了其他版本。

先从 npm registry 取得该固定版本 tarball 并核对 `dist.integrity`，再解压到项目外的临时目录。当前验证包的 SHA-512 SRI 为：

```text
sha512-FpFfgZFhLukAphGLK6SkM8NHvqdsVIRfqy2cOlyrU+TNGp7FugL8y2sXx87lrgEhlfdDdxdF7Ywaf4XN/IlXDA==
```

在已安装项目依赖的 `web/` 目录运行：

```bash
node scripts/webmcp-dev-protocol-smoke.mjs /absolute/path/to/extracted/package
pnpm exec vitest run test/unit/services/webmcp
pnpm run type-check
pnpm run build
```

协议脚本检查 manifest 名称/版本，调用传入的原始发布 bundle 并临时转译当前 transport；执行真实 stdio 与 WebSocket 通信，包括配对、工具发现、调用、错误及重连。它不负责下载或校验 tarball，所以必须先核验完整性。脚本使用临时配置目录与端口，结束时清理自己启动的子进程，不修改真实桥接配置、不调用上游全局停止命令。协议脚本中的锁是测试替身，不能代替 Chrome Web Locks 或 WorkBuddy 实际使用验收。

修改工具只维护现有业务工具注册；适配层仍只向桥接注册两个固定入口。回退时关闭功能开关并重新启动/构建，原生 WebMCP 和普通人工编辑保留。首期不发布生产、不维护第三方桥接分支；豆包桌面版仅记录接入探测，不阻塞 WorkBuddy 验证。

豆包探测结果：当前 Mac 桌面版 2.28.13 实际 UI 的“技能·连接器·伙伴 → 新建 → 新建自定义连接器”提供 HTTP 和 STDIO，选择 STDIO 后可填写服务器名称、命令、参数及环境变量。**已发现官方本地 STDIO 入口，业务兼容未验证**；本轮未保存配置或实际配对，也不增加非官方桌面自动化桥接。


### WorkBuddy 已连接但找不到工具（P1 复现）

页面“已连接”表示桥接握手及两个固定入口注册已收到回执，不保证客户端工具索引已同步。WorkBuddy 5.5.2 曾在重新配对后，旧任务和全新短任务均只发现 `_webmcp_get-token` / `_webmcp_define-mcp-tool`；独立上游 `tools/list` 同时能列出本站两个入口。不要照客户端建议重新定义业务工具，也不要重放先前写入。已实际在 Custom connectors 中关闭再开启 `xrugc-webmcp-dev`，本次仍未恢复工具发现；不要让用户反复执行同一无效操作。仍无法发现时，保留验证结论并停止扩展，详见 P1 验收记录。


P1 后续恢复记录：完整退出再启动 WorkBuddy 后，保留旧配对仍无效；由重启后的实际客户端生成**新令牌**，网站先断开旧连接再重新配对，随后实际工具发现、实体读取和确认保存恢复。建议按此顺序尝试一次，并以真实 list/read 调用判定，不能只看绿色连接状态。此次之后测试被客户端积分耗尽阻断，尚未完成长期稳定性和全部四页验收。


## 线上部署开关

容器设置 `APP_WEBMCP_DEV_ENABLED=true` 后重建，启动脚本将值写入 `/__env.js` 的 `WEBMCP_DEV_ENABLED`。默认关闭；明确设置 `false` 会覆盖构建时开关。先部署开发环境并核验实际版本、HTTPS 到本机桥接配对及工具调用，通过后再推进正式环境。浏览器如提示本地网络访问，需允许当前站点连接本机桥接。桥接始终运行在用户电脑，不部署到业务服务器。

回退：将该容器变量设为 `false` 后重建并刷新页面。保留原生 WebMCP 和普通编辑入口。实际 WorkBuddy 验收可能受账户额度影响，连接握手/独立协议检查不能替代真实客户端业务验收。
