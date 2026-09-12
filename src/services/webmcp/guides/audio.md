# 讲解音频与播放同步

## 目的与前置条件

让讲解清晰、章节完整、按钮反馈及时。已有录音或合格音频可直接使用；网站指南不执行本地语音合成。需要原包 Serena 旁白时，另需 Qwen3-TTS 模型、兼容 Python 依赖以及 FFmpeg/ffprobe，并确认模型和素材的使用条件。

## 操作步骤

1. 先定稿讲解内容、章节顺序、音色和停止行为。原包旁白脚本固定中文 Serena；不能仅通过网站指南更换音色。需要其他音色时选择对应工具或已有录音。
2. 长旁白按自然章节制作独立音频，逐章听检遗漏、重复、发音、静音与尾句，保持音色参数一致。生成 token 上限可能截断长文，切章也需检查句子完整性。
3. 在实体编辑页搜索现有音频；缺少时使用 `xrugc_start_asset_upload` 打开界面，由用户选择文件。上传后重新查询资源 ID，按 `assets` 主题放入并保存。
4. 实体脚本用 `xrugc_open_entity_script_editor` 打开抽屉，读取 `xrugc_get_entity_workspace_context` 确认 `script.ready`；场景脚本用 `xrugc_open_scene_script_editor` 在原场景 URL 打开抽屉。返回 `opened` 只表示抽屉打开，再读 `xrugc_get_scene_workspace_context` 确认 `script.ready` 并重新发现工具，读取真实 JS/Lua 和积木目录。互斥旁白先停后播，章节用等待完成的任务顺序播放；效果声与动画按支持的并行任务同步。
5. 点击按钮应立即给短反馈；停止需要结束当前声音并取消后续章节。检查任务创建与执行是否导致重复播放，以及音频队列是否把并行效果声拖到长旁白之后。
6. 场景音频运行验收先用 `xrugc_close_scene_script_editor` 关闭抽屉。按原未保存确认选择；工具不自动保存或放弃，`cancelled` 时保留抽屉。关闭成功后读 `scene.ready` 并重新发现 `xrugc_start_scene_runtime_preview`。抽屉开关即使不改 URL 也会切换工具；独立 `/verse/script` 保留运行工具兼容。

返回实体时调用 `xrugc_close_entity_script_editor`，沿用未保存确认，不自动保存或放弃修改；`cancelled` 时保留抽屉。关闭成功后重新检查 `entity.ready`，即使 URL 不变也需重新发现实体工具。独立 `/meta/script` 路由仍受支持。

## 验证与限制

本地预检或 `dry-run` 不加载模型，不能证明真实合成或 WebMCP 连接成功。响度处理目标不等于精确测量结果；需要严格标准时另行测量。试听人声与效果声的比例，并分别测试 Lua/Unity 及目标设备的重播、停止和退出清理。脚本生成成功不能证明旁白不会叠播。
