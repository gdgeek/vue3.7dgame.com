# 按钮、组件与脚本

## 目的与前置条件

建立按钮、动画、移动和音频之间的可重复交互。先读取节点、组件、动作标识和实际动画名称；仅调整布局时保留现有脚本。实体脚本可能影响所有引用该实体的场景。

## 操作步骤

1. 实体编辑页用 `xrugc_get_node_components` 查看组件；通过 `xrugc_stage_component_batch` 与 `xrugc_complete_component_batch` 预览、确认并保存必要变更。
2. 当前组件类型包括 Action、Moved、Trigger、Rotate、Tooltip。按钮动作与脚本标识应一致，组件设置和互斥条件以编辑器校验为准；不要猜字段或创建未知类型。自旋转默认状态与停止动作需一致。
3. 实体逻辑在实体工作区调用 `xrugc_open_entity_script_editor`，再读 `xrugc_get_entity_workspace_context` 确认 `script.ready`；场景逻辑在场景工作区调用 `xrugc_open_scene_script_editor` 打开右侧脚本抽屉。`opened` 只表示打开，需再读常驻 `xrugc_get_scene_workspace_context` 确认 `script.ready`，即使 URL 不变也重新发现工具。用 `xrugc_get_meta_script` 或 `xrugc_get_scene_script` 读取工作区，并按需设置 `includeGeneratedCode: true` 查看真实 Lua/JavaScript。独立 `/meta/script` 与 `/verse/script` 仍可使用。
4. 用 `xrugc_get_script_block_catalog` 和 `xrugc_get_script_block_structure` 查实际积木类型与连接。局部修改采用 `xrugc_stage_script_block_batch`、`xrugc_complete_script_block_batch`；仅在需要完整替换时使用当前编辑上下文的脚本替换工具。
5. 核对动作、节点、资源和 clip 引用；单实体逻辑留在实体脚本，跨实体通信先读取 `xrugc_get_entity_signals`。修改后校验、检查保存回执并重载读取。
6. 实体抽屉内实体主工具暂停；返回实体用 `xrugc_close_entity_script_editor`，沿用未保存确认，不自动保存或放弃修改；`cancelled` 时保留抽屉，关闭成功后重读 `entity.ready` 并重新发现工具。抽屉内场景主工具暂停。返回场景调用 `xrugc_close_scene_script_editor`，按原未保存确认选择；工具不自动保存或放弃，`cancelled` 时保留抽屉。关闭成功后脚本工具注销，再读 `scene.ready` 并重新发现场景工具，才能开始场景运行。

## 验证与限制

Blockly 工作区是持久化脚本源，不直接用生成代码替代。JS 与 Lua 生成成功、编辑器预览和真实运行需分别验证。测试快速连点、停止、重启和退出清理；动画不要覆盖交互根节点变换。实体脚本页不能启动场景运行预览，应切换到包含该实体的场景。场景脚本抽屉也不提供运行工具；关闭成功后在场景重新发现 `xrugc_start_scene_runtime_preview`。独立 `/verse/script` 保留运行工具兼容。语音、拖动和双手缩放是否支持以实际运行端验证为准。
