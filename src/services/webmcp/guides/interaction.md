# 按钮、组件与脚本

## 目的与前置条件

建立按钮、动画、移动和音频之间的可重复交互。先读取节点、组件、动作标识和实际动画名称；仅调整布局时保留现有脚本。实体脚本可能影响所有引用该实体的场景。

## 操作步骤

1. 实体编辑页用 `xrugc_get_node_components` 查看组件；通过 `xrugc_stage_component_batch` 与 `xrugc_complete_component_batch` 预览、确认并保存必要变更。
2. 当前组件类型包括 Action、Moved、Trigger、Rotate、Tooltip。按钮动作与脚本标识应一致，组件设置和互斥条件以编辑器校验为准；不要猜字段或创建未知类型。自旋转默认状态与停止动作需一致。
3. 切到对应脚本页后重新发现工具。用 `xrugc_get_meta_script` 或 `xrugc_get_scene_script` 读取工作区，并按需设置 `includeGeneratedCode: true` 查看真实 Lua/JavaScript。
4. 用 `xrugc_get_script_block_catalog` 和 `xrugc_get_script_block_structure` 查实际积木类型与连接。局部修改采用 `xrugc_stage_script_block_batch`、`xrugc_complete_script_block_batch`；仅在需要完整替换时使用该页面的脚本替换工具。
5. 核对动作、节点、资源和 clip 引用；单实体逻辑留在实体脚本，跨实体通信先读取 `xrugc_get_entity_signals`。修改后校验、检查保存回执并重载读取。

## 验证与限制

Blockly 工作区是持久化脚本源，不直接用生成代码替代。JS 与 Lua 生成成功、编辑器预览和真实运行需分别验证。测试快速连点、停止、重启和退出清理；动画不要覆盖交互根节点变换。实体脚本页不能启动场景运行预览，应切换到包含该实体的场景。语音、拖动和双手缩放是否支持以实际运行端验证为准。
