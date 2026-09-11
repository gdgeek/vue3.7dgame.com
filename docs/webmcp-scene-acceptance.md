# WebMCP 联合验收

本清单用于 web、Editor、Blockly 与 WebGL Preview 四端部署到同一测试环境后的验收。单元测试与生产构建通过并不等价于真实 Unity 或后端发布通过。

## 准备

1. 使用具备编辑权限的测试账号和可修改的独立场景/实体。
2. 确认四端版本匹配，Editor/Blockly 能返回 `webmcp-get-capabilities`，且请求响应带 hostSessionId。
3. 使用支持 `document.modelContext` 的浏览器；若使用测试 registry shim，仅标记为工具合同验收，不标记原生 WebMCP 验收。
4. 先执行 `pnpm run test:run`、`pnpm run type-check`、`pnpm run build`。

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
