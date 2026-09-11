# WebMCP 集成与可靠性

本实现将 web PR #40 的工具能力迁移到 develop，配合 Editor PR #7、Blockly PR #8 与 WebGL Preview PR #1 的适配层重写。保留 develop 的脚本保存协议、Unity 预览会话和当前依赖版本。

## 页面能力

- 实体编辑器：实时实体树、节点检查、校验、资源查询，以及节点变换、属性、层级、顺序、复制、删除、批量修改、组件、信号与资源放入。
- 场景编辑器：实时场景读取、实体搜索/放入、实例变换/属性/删除、资源与发布前检查、确认发布、Unity 预览状态与诊断。
- 实体和场景 Blockly 页：工作区读取/校验、积木目录/结构、临时工作区验证、整份替换与批量操作。
- 场景 Blockly 页复用 Unity 场景预览工具。实体 Blockly 页只暴露编辑能力；运行时验收应进入包含该实体的场景。未恢复 develop 已删除的浏览器 JavaScript 执行器。

注册器使用 `document.modelContext.registerTool`。不支持 WebMCP 的浏览器保持原有页面功能。工具随页面卸载、停用、路由变化及 iframe INIT 生命周期撤销；重新进入页面会创建新的草稿空间。

## 写操作合同

`stage` 在可见编辑器或临时工作区验证提案并生成有时限的草稿，同时记录已加载的服务器版本。P1 的 `complete` 立即返回 `operationId` 与 `awaiting_confirmation`，后台仍展示原操作详情并等待用户确认，再检查页面会话与版本。调用方随后用 `xrugc_get_operation_status` 查询，不能把首次返回当作完成。草稿单次消费，确认等待期间过期、并发重复请求、页面切换均不能复用草稿。

同一账号与目标只允许一个正在执行的 WebMCP 完成操作。重复 complete 返回已有状态，不再次执行。`xrugc_cancel_operation` 只取消仍等待确认的操作；即使用户之后点击原确认框，也不会继续写入。提交开始后不能取消已发往后端的事务。

iframe RPC 关联 requestId、当前 frame、精确 origin 和 hostSessionId。异步资源读取后、新的写入或保存开始前再次检查注册会话。Editor 与 Blockly 端仍执行权限、版本和上下文校验，工具注解不替代这些检查。

节点编辑通过项目自有命令和适配器执行；不修改 Three.js 和 Blockly 外部库。Blockly 批量操作先在临时工作区验证，确认框列出目标积木、操作及字段前后值，成功修改支持一次撤销，失败恢复原工作区。

## 完成状态与持久化

- `status: completed` 携带保存回执；`persistence: server_acknowledged` 表示服务端保存请求已成功返回。
- `editorAcknowledged` 独立表示编辑器保存标记的确认。实体/场景标记失败不会把已成功保存的数据报告为保存失败；dirty 状态保留以便重新读取。
- 编辑器已应用但保存未确认时返回 `status: partial`、`editorApplied: true`、`persistence: unverified`，并提示 `read_state_before_retry`。不能盲目重放原修改。
- 发布成功返回 snapshotId 和持久化操作回执，页面刷新失败保留回执并返回 refreshWarning。P1 使用现有可变 Snapshot，`readBackVerified` 保持 false；当次发布成功不代表能读回当时的固定内容。

后端配套提供保存/脚本保存/发布的 UUID 幂等键和 `If-Match` 乐观锁。编辑器人工保存也使用加载时的服务器版本，409 后保留本地内容，不自动覆盖新版本。缺少服务器版本或匹配回执时不能视为保存成功。后端仅新增操作回执表 webmcp_operation，schema 和路由必须先部署，详细迁移见后端 `docs/webmcp-p1.md`。主站运行器整合与可靠性增强分别交付。

页面操作状态包括 awaiting_confirmation、executing、submitting、completed、partial、cancelled、failed、unknown。浏览器 sessionStorage 最多保留 100 条、24 小时的操作元数据，包含账号/目标/操作 ID，不保存提案、结果正文、token 或资源 URL。重载后以服务器回执恢复已提交的保存/发布结果；404 是 not_observed，不能据此重试。完整编辑器结果仅留在当前内存，取消和未提交操作没有持久化后端回执。

资源重命名、上传等未接入这五个后端写入入口的动作，只具备当前页面完成状态，不能承诺重载后的后端幂等恢复。场景引用的其他实体/资源没有统一锁定；当前版本保护的是目标主记录及其脚本。

## 读取与运行诊断

实体读取来自 `webmcp-get-entity-state` 的实时序列化结果，携带 source、entityVersion、contextGeneration 和 dirty 状态，避免把页面缓存当成未保存编辑内容。

资源检查只检查实体/资源元数据、引用和文件信息。`metadataReady` 不代表模型下载、初始化、脚本行为、动画或设备兼容性通过；没有证据的项目保留 unknown。

场景上下文的 published 来自独立后端 publication 查询。查询失败时保留未知，不猜测旧 verseRelease 字段。`xrugc_get_scene_publication` 只读取当前发布状态和快照标识（current_snapshot），不接受历史版本参数。固定历史发布快照和独立版本读回属于 P2。

Unity 桥接接收 `WGP-UNITY-LOADER`、`WGP-UNITY-START`、`WGP-UNITY-TIMEOUT` 与 `SCENE_FORWARD_FAILED`，兼容旧 `UNITY_LOAD_FAILED`。启动前错误必须带当前 nonce，关闭后与旧会话消息被忽略。诊断只返回允许的错误码与阶段，不回传原始 token、签名 URL 或消息正文。启动工具返回可见预览的 loading 状态，随后读取状态直至运行器实际确认 running。

## 验证范围

单元测试覆盖草稿生命周期、实时读取、部分完成回执、发布回执保留、RPC 并发和会话隔离、Unity 错误、场景播放适配器及现有脚本保存回归。运行命令：

```bash
pnpm run test:run
pnpm run type-check
pnpm run build
```

真实浏览器和后端验收步骤见 [验收清单](./webmcp-scene-acceptance.md)。本文件不将原 PR 作者的历史测试场景、登录会话或截图视为本次迁移的验证证据。原生 WebMCP transport、真实 Unity 资源加载、当前发布状态与操作回执、头显行为需要对应运行环境验收；历史快照读回不在 P1 验收范围。
