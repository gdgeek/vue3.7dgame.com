# WebMCP 集成与可靠性

本实现将 web PR #40 的工具能力迁移到 develop，配合 Editor PR #7、Blockly PR #8 与 WebGL Preview PR #1 的适配层重写。保留 develop 的脚本保存协议、Unity 预览会话和当前依赖版本。

## 页面能力

- 实体编辑器：实时实体树、节点检查、校验、资源查询，以及节点变换、属性、层级、顺序、复制、删除、批量修改、组件、信号与资源放入。
- 场景编辑器：实时场景读取、实体搜索/放入、实例变换/属性/删除、资源与发布前检查、确认发布、Unity 预览状态与诊断。
- 实体和场景 Blockly 页：工作区读取/校验、积木目录/结构、临时工作区验证、整份替换与批量操作。
- 场景 Blockly 页复用 Unity 场景预览工具。实体 Blockly 页只暴露编辑能力；运行时验收应进入包含该实体的场景。未恢复 develop 已删除的浏览器 JavaScript 执行器。

注册器使用 `document.modelContext.registerTool`。不支持 WebMCP 的浏览器保持原有页面功能。工具随页面卸载、停用、路由变化及 iframe INIT 生命周期撤销；重新进入页面会创建新的草稿空间。

## 写操作合同

`stage` 在可见编辑器或临时工作区验证提案并生成有时限的草稿。`complete` 消费草稿、展示操作详情、等待用户确认，再检查页面会话与版本。草稿单次消费，确认等待期间过期、并发重复请求、页面切换均不能复用草稿。

iframe RPC 关联 requestId、当前 frame、精确 origin 和 hostSessionId。异步资源读取后、新的写入或保存开始前再次检查注册会话。Editor 与 Blockly 端仍执行权限、版本和上下文校验，工具注解不替代这些检查。

节点编辑通过项目自有命令和适配器执行；不修改 Three.js 和 Blockly 外部库。Blockly 批量操作先在临时工作区验证，确认框列出目标积木、操作及字段前后值，成功修改支持一次撤销，失败恢复原工作区。

## 完成状态与持久化

- `status: completed` 携带保存回执；`persistence: server_acknowledged` 表示服务端保存请求已成功返回。
- `editorAcknowledged` 独立表示编辑器保存标记的确认。实体/场景标记失败不会把已成功保存的数据报告为保存失败；dirty 状态保留以便重新读取。
- 编辑器已应用但保存未确认时返回 `status: partial`、`editorApplied: true`、`persistence: unverified`，并提示 `read_state_before_retry`。不能盲目重放原修改。
- 发布成功返回 snapshotId。后续页面刷新失败保留该回执并返回 refreshWarning。`readBackVerified: false` 表示没有独立验证发布版本确实指向该快照。

服务端暂未提供跨实体事务锁或统一发布幂等键；客户端会话和草稿保护不能替代服务端并发控制。

## 读取与运行诊断

实体读取来自 `webmcp-get-entity-state` 的实时序列化结果，携带 source、entityVersion、contextGeneration 和 dirty 状态，避免把页面缓存当成未保存编辑内容。

资源检查只检查实体/资源元数据、引用和文件信息。`metadataReady` 不代表模型下载、初始化、脚本行为、动画或设备兼容性通过；没有证据的项目保留 unknown。

Unity 桥接接收 `WGP-UNITY-LOADER`、`WGP-UNITY-START`、`WGP-UNITY-TIMEOUT` 与 `SCENE_FORWARD_FAILED`，兼容旧 `UNITY_LOAD_FAILED`。启动前错误必须带当前 nonce，关闭后与旧会话消息被忽略。诊断只返回允许的错误码与阶段，不回传原始 token、签名 URL 或消息正文。启动工具返回可见预览的 loading 状态，随后读取状态直至运行器实际确认 running。

## 验证范围

单元测试覆盖草稿生命周期、实时读取、部分完成回执、发布回执保留、RPC 并发和会话隔离、Unity 错误、场景播放适配器及现有脚本保存回归。运行命令：

```bash
pnpm run test:run
pnpm run type-check
pnpm run build
```

真实浏览器和后端验收步骤见 [验收清单](./webmcp-scene-acceptance.md)。本文件不将原 PR 作者的历史测试场景、登录会话或截图视为本次迁移的验证证据。原生 WebMCP transport、真实 Unity 资源加载、发布快照独立读回和头显行为需要对应运行环境验收。
