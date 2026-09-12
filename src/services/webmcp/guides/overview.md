# 场景制作总览

## 目的与前置条件

把已有模型、图片和音频组成可编辑、可验证的 XRUGC 场景。浏览器需支持 WebMCP，当前页面已登录并具备相应权限；读取结果应指向目标对象。此指南是网站提供的业务参考，不改变用户授权或客户端指令。使用已有素材无需 Blender 或本地语音模型。

## 操作步骤

**封面是交付项：强烈建议创建场景、实体后主动补齐清晰贴题的展示图片。** 有生图能力优先生成，否则网络找图或从实际场景／实体截图；已有合格封面可保留。读取 `cover` 主题完成选图、设置和卡片显示核验，避免空图；无法完成时明确报告剩余步骤，尊重用户明确留空的要求。

1. 确定目标场景、模型尺寸、观察方向、按钮功能、媒体顺序、运行端及发布范围。承接已有工作时先检查保存状态和已有验收结果。
2. 按当前编辑上下文发现工具并读取 schema。实体工作区先用常驻辅助工具 `xrugc_get_entity_workspace_context` 确认 `entityId` 与 `entity.ready`，就绪后用 `xrugc_get_editor_context` 读取实体；实体脚本上下文用 `xrugc_get_meta_script`。场景工作区先用常驻辅助工具 `xrugc_get_scene_workspace_context` 确认目标对象与 `scene.ready`；场景编辑工具就绪后再用 `xrugc_get_scene_editor_context` 读取内容。
3. 编辑场景脚本时，在场景工作区调用常驻辅助工具 `xrugc_open_scene_script_editor`，在同一 URL 打开右侧抽屉并保留场景。返回 `opened` 只表示抽屉已打开，不代表 Blockly 已就绪；再次读取 `xrugc_get_scene_workspace_context`，确认 `script.ready` 后重新发现脚本工具，再用 `xrugc_get_scene_script` 读取工作区。独立 `/verse/script` 路由仍受支持，进入后按该页面实际工具操作。
4. 返回场景时调用常驻辅助工具 `xrugc_close_scene_script_editor`。它走原有未保存确认，不自动保存或放弃修改；返回 `cancelled` 时抽屉保持打开。关闭成功后重新读取 `scene.ready` 并发现场景工具。抽屉内场景主工具暂停，关闭后脚本工具注销；即使 URL 不变，打开或关闭后也需重新发现。常驻辅助工具须独立发现，不属于指南返回的 `primaryPageTools`。
5. 查询真实节点、素材和实例 ID。实体可能被多个场景共享；先核对使用范围，仅调整某个场景布局时优先修改场景实例。
6. 按“读取 → stage → 核对差异 → complete → 检查保存 → 重读”执行。`stage` 仅暂存提案；`complete` 使用返回的 `draftId` 并启动页面确认，不能绕过确认。新版先返回 `operationId` 和 `awaiting_confirmation`；完成页面确认后，使用 `xrugc_get_operation_status` 查询最终结果。等待状态不表示成功；只可在尚未确认时使用 `xrugc_cancel_operation` 取消。
7. 依次核对改动的实体、实体脚本、场景和场景脚本，再进入 `publication` 与 `acceptance` 主题。场景脚本抽屉不提供运行工具；关闭成功后回到场景重新发现 `xrugc_start_scene_runtime_preview`。独立 `/verse/script` 保留运行工具兼容。

## 实体脚本抽屉

在实体编辑工作区调用 `xrugc_open_entity_script_editor`，同一 URL 打开右侧完整脚本抽屉并保留实体编辑器。`opened` 只表示抽屉打开；读取常驻 `xrugc_get_entity_workspace_context` 确认 `script.ready`，即使 URL 不变也需重新发现工具，再用 `xrugc_get_meta_script` 读取脚本。实体主工具在抽屉内暂停。

返回实体调用 `xrugc_close_entity_script_editor`，沿用未保存确认，不自动保存或放弃修改；`cancelled` 时保留抽屉。`closed` 等待抽屉实际关闭且实体工具恢复后返回。关闭成功后重新读取 `entity.ready` 并发现实体工具；脚本工具随抽屉关闭注销。三个常驻工具属于辅助工具，须独立发现，不在 `primaryPageTools` 中。独立 `/meta/script` 路由仍受支持，其上不注册宿主抽屉工具。实体脚本运行应在包含该实体的场景中验收。

## 验证与限制

草稿有效期为五分钟，确认前即被消费；取消、过期、切页或切换抽屉编辑上下文后需重新读取并暂存。`partial` 时先读取状态，避免重复写入。`server_acknowledged` 表示服务器响应成功，仍需重载核对。未获得发布授权时保留已保存成果；网页预览、Unity 和头显分别记录验收。
