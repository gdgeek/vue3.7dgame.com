# WebMCP 联合验收

本清单用于 web、Editor、Blockly 与 WebGL Preview 四端部署到同一测试环境后的验收。单元测试与生产构建通过并不等价于真实 Unity 或后端发布通过。

## 准备

1. 使用具备编辑权限的测试账号和可修改的独立场景/实体。
2. 确认四端版本匹配，Editor/Blockly 能返回 `webmcp-get-capabilities`，且请求响应带 hostSessionId。
3. 使用支持 `document.modelContext` 的浏览器；若使用测试 registry shim，仅标记为工具合同验收，不标记原生 WebMCP 验收。
4. 先执行 `pnpm run test:run`、`pnpm run type-check`、`pnpm run build`。

## 网站指南：无需安装本地场景 Skill

以下为待执行的真实环境清单；勾选时记录浏览器、客户端、前端版本、目标对象、实际步骤和结果。单元测试中的模拟注册器不能代替原生 WebMCP 发现证据，也不能把指南加载成功记为编辑或运行验收通过。

- 使用未安装 `xrugc-scene-studio`、未粘贴其正文的干净客户端会话，登录已部署指南功能的 XRUGC 页面。直接给出一个场景制作任务，记录客户端是否发现并调用 `xrugc_get_workflow_guide`；若需人工提示才读取，分别记录发现与任务使用结果。
- 分别进入实体编辑、场景编辑、实体脚本、场景脚本页，检查各页恰有一个指南工具。四页的上下文或脚本读取结果应包含 `workflowGuide` 入口，返回的 `page` 和 `contextTool` 应与当前页面一致。
- 用 `{}` 读取默认 `overview`，再读取 `assets`、`layout`、`interaction`、`audio`、`publication`、`acceptance`、`troubleshooting`。核对版本 `1.0.0`、主题目录、文档正文及链接；未知主题、路径式主题和额外参数应被拒绝。
- 指南返回的 `primaryPageTools` 只代表页面主工具集定义。对照浏览器实际发现的 schema，确认客户端没有据此假定辅助工具存在、已登录或编辑器已就绪。
- 切页、退出或停用页面后，旧指南注册应释放，保存的旧调用应失败；新页面只注册一个当前指南。加载指南期间切页也不应返回旧页面的结果。
- 读取指南前后核对 dirty、对象版本和网络写入，确认未编辑、上传或发布。使用现有素材跑通下面的实体/脚本/场景闭环，原 stage/complete 用户确认、过期检查、保存回执和发布授权均应保留。
- 从工具返回的 `indexUrl` 和 `documentationUrl` 读取索引及八篇文档。分别验证开发服务、生产构建和实际子路径部署，确保返回对应 JSON/Markdown，而非 SPA 入口页面；正文应与工具读取一致。
- 使用不支持 `document.modelContext` 的浏览器打开同样页面，确认无注册错误，原有人工编辑、保存和预览流程正常。静态文档仍可读取，但不应宣称该浏览器已获得 WebMCP 能力。
- 确认指南没有安装本地 Skill、执行脚本或提供 Blender、Qwen、FFmpeg。已有素材任务应可继续；需要外部制作环境时记录实际缺项，不把 `dry-run` 当作真实合成成功。

## 实体编辑闭环

- 读取实体树；在可见 iframe 内手工重命名但不保存，再读取，确认工具返回新名称、dirty=true 和 live-editor 来源。
- 暂存节点变换，检查确认框的当前值/目标值，确认一次；检查可见节点、撤销/重做、保存回执，再刷新验证后端数据。
- 对多个组件执行连续删除再撤销/重做，确认无残留或重复组件。
- 复制带子节点和内部信号/提示引用的子树，确认内部引用指向副本，外部引用按合同保留。
- 放入素材过程中切换实体/重新 INIT，旧请求不得插入到新实体。重复执行同一草稿不得重复插入。

## Blockly 编辑闭环

- 读取工作区、积木目录与结构，检查 warnings、canSave 和 validationScope。
- 暂存一组新建、字段变更、连接及删除操作；确认框显示实际目标与字段前后值。
- 确认后检查生成 Lua/JavaScript、可见工作区、一次撤销与重做、服务端保存和重新加载。
- 注入应用中途失败，确认原工作区和撤销历史恢复；并发请求的响应不能串 requestId。
- 请求处理中更换脚本/重新 INIT，旧响应不得进入新会话。保存警告保持 develop 原有非阻塞语义。

## 场景发布与预览闭环

- 读取场景、实体引用与资源检查结果；空场景、缺失文件元数据、权限不足和未保存修改应阻止发布。
- 暂存发布后修改可见场景，确认旧草稿失效。
- 在独立场景确认发布，记录 snapshotId。若发布后刷新失败，应仍返回服务器确认的 snapshotId，并提示重新读取而非重复发布。
- 使用后端支持的独立查询验证快照；若接口缺失，保留 readBackVerified=false，不将 GET 场景成功视为快照验证成功。
- 打开 Unity 预览，先观察 loading，再等待运行器报告 running。分别注入 loader/start/timeout/scene-forward 错误，检查脱敏码与阶段。
- 关闭/重新打开预览后注入旧 nonce 消息，状态不得变化。
- 场景 Blockly 页使用同一个 Unity 预览合同；实体 Blockly 脚本在其所属场景中验证运行效果。

## 生命周期和部分完成

- 并发 complete 同一 draftId：最多一次应用。
- 确认框等待到草稿过期：不写入。
- A→B→A 路由切换及同一实体重新 INIT：旧草稿不可复用。
- iframe 已应用修改后模拟保存网络失败：返回 partial、editorApplied 与 unverified 回执，先读取状态再决定恢复。
- 服务端保存成功后模拟编辑器 ACK 失败：保留 server_acknowledged，editorAcknowledged=false；不能声称已回滚服务端保存。

`scripts/webmcp-scene-e2e.mjs` 是可选的本地只读/暂存取消辅助脚本。执行前审查环境变量、目标地址及账号权限；该脚本不替代上述真实写入、后端读回或原生 WebMCP 验收。
