# 批量节点与可查询的创作设置

在实体工作区等待 ready，关闭脚本抽屉后重新发现工具，先调用 `xrugc_get_entity_authoring_capabilities`。返回的桥接 action 清单才代表此编辑器实现了哪些接口；旧编辑器未升级时报告能力缺失，不假装已执行。

## 批量放入资源、空分组和文字

`xrugc_stage_node_creation_batch` 接收 1–20 个 items，每项含唯一 `clientKey` 和 `kind`：

- resource：传 `resourceType` 和已有 `resourceId`，不用文件 ID 或 URL。
- empty：创建分组节点，可将内容和操控台放在不同父级。
- text：`text.content` 为初始内容，可带 size、color、rect、align、background、follow；实际范围见 schema。

每项可指定 name、visible、transform（position / rotationDegrees / scale）。指定已有 `parentNodeId` 或同批 `parentClientKey`，二者不能同时使用；省略则放在根层级。父引用可指向同批后面的项，循环和缺失引用会拒绝。

读取统一预览，调用 `xrugc_complete_node_creation_batch({draftId})` 完成页面确认；随后用 `xrugc_get_operation_status` 查询原保存操作。一次批次校验及加载完成后才整体修改编辑器，再保存一次实体。73 个节点可分为多批，不是跨批事务。服务端版本冲突、保存失败或响应丢失仍可能需要恢复，不能把编辑器原子应用当成数据库成功。

结果 items 映射 clientKey 到 nodeId、parentNodeId 和资源 ID。保存后重新读取实体树核对。`xrugc_get_node_creation_operation({operationId})` 只查询当前编辑器会话内的创建结果，含 scope / persisted 边界；服务器保存回执仍用原操作查询。刷新后会话记录 unknown 不证明未创建，不重放已完成批次。用已保存 UUID 和原回执核对；确定未应用的失败批次才重新预览。

## 声音和文字字段

用 `xrugc_get_node_authoring_properties({nodeId})` 读取 current properties、defaults、constraints 和版本；用 `xrugc_stage_node_authoring_properties({nodeId,properties})` 预览，再 `xrugc_complete_node_authoring_properties({draftId})` 确认保存。

- Sound：loop、play、volume、rate。它们是声音节点字段，不是新增 Audio 组件。保存成功不等于所有运行端已经消费这些设置。
- Text：text、size、color、rect、align、background、follow。沿用已有序列化，不改动作引用及其他字段。

脚本动态文字与初始文字分开验收。当前自定义积木 `set_text` 的 value 是固定文本字段，可以用条件分支切换不同固定文案；不要把它描述为已有任意变量输入。请先查询真实积木目录和字段，运行端是否实际更新另行验证。

## 实际导入动画与预览

`xrugc_get_model_animation_metadata({nodeId})` 读取当前实例真实导入的 clips、clipIndex / selectionValue、精确 name、duration、resourceVersion 和 animationVersion。ready 且 clips 为空才能表示确认无动画；unknown / pending 不能做这个推断。selectionValue 是此查询返回的预览选择值，Blockly 动画字段仍按实际目录选择精确名称，不能把 `clip:0` 当 clip 名写入。

`xrugc_get_editor_animation_preview({nodeId})` 返回状态；`xrugc_control_editor_animation_preview` 接受 nodeId、expectedAnimationVersion、command（play/pause/resume/stop/seek），选择动画用 clipIndex，seek 用 clip-local 秒数 time。先读取 metadata，time 不超过 clip 时长，暂停／恢复要求已有活动预览。停止的姿态语义以返回 stopBehavior 为准，不将其等同于课程 Reset。

这些控制明确属于 `scope=editor-preview`、`persisted=false`、`runtimeControl=false`。它们不创建课程按钮脚本、不保存模型播放策略，也不证明 Unity 或课程运行器具备暂停、取消或 Reset。隐藏节点不等于停止动画，停止旧任务的完整运行语义属于独立运行适配层工作。

编辑器预览期间，写入与保存返回 `ANIMATION_PREVIEW_ACTIVE`；先 stop 再预览编辑。网页用户输入会先停止预览再执行原 UI 动作；序列化不会把临时预览姿态作为创作变换保存。
