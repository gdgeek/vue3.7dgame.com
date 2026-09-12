# 状态恢复与排障

## 目的与前置条件

在连接、写入或运行不确定时恢复可核对的状态。先保留目标对象、操作名称、结果状态、版本和脱敏错误码；不导出 token、cookie、签名 URL 或完整私有日志。

## 操作步骤

1. 工具缺失时检查浏览器支持、当前登录页面和编辑器是否加载完成。场景工作区用常驻 `xrugc_get_scene_workspace_context` 检查 `scene.ready` / `script.ready`。`xrugc_open_scene_script_editor` 返回 `opened` 只表示抽屉打开，应再次读取上下文确认 Blockly 就绪；抽屉内场景主工具暂停，关闭后脚本工具注销。切页或打开、关闭抽屉后，即使 URL 不变也需重新发现工具；常驻辅助工具不在 `primaryPageTools` 中，须独立发现。单独启动主前端不代表 Editor、Blockly、后端或内置运行制品已就绪。无法发现时使用可用的原生界面，不猜工具名。
2. `expired_or_missing`、取消或对象变化后，重新读取当前内容再暂存。已经启动的 complete 应按原 operationId 查询；重复 complete 返回同一操作状态，不会重新提交。等待确认的草稿仍有有效期。
3. complete 首次返回 `operationId/awaiting_confirmation` 后，完成页面确认，再用 `xrugc_get_operation_status({ operationId })` 查询。超时或 `partial/unverified` 时保留本地内容并查询原操作；`unknown/not_observed` 不证明写入失败，不要重新生成操作并重复放入素材、组件或实体。
4. 四个编辑页遇到 `server_rejected/write_conflict/httpStatus=409` 时，服务器已拒绝旧版本写入。本地修改仍未保存；先保留/备份本地内容，再只读核对服务器最新版，由用户选择取舍后重新暂存和确认。不要直接刷新丢掉本地修改，也不要自动强制覆盖。
5. 保存失败或结果未知后自动保存暂停；编辑器报告“无新增修改”不能代替服务器成功回执。`server_acknowledged` 且 `editorAcknowledged: false` 时，先保留本地内容、核对原操作及服务器版本；不能仅凭 dirty 标记再次写入，也不能声称服务器已回滚。
6. `xrugc_cancel_operation` 只取消仍等待确认的操作。已执行/提交的操作返回 `not_cancellable`，继续查原回执；不能将关闭确认框当作撤回已提交事务。
7. 场景加载异常时用 `xrugc_get_scene_runtime_preview_status` 和场景编辑上下文的 `xrugc_get_scene_runtime_diagnostics` 区分加载器、Unity 启动、场景转发及资源错误。抽屉内先用 `xrugc_close_scene_script_editor` 走原未保存确认；工具不自动保存或放弃，`cancelled` 时保留抽屉。关闭成功后重新读取 `scene.ready` 并发现诊断和运行工具。独立 `/verse/script` 保留运行工具兼容，从该页面回到场景后仍需重新发现诊断工具。
8. 旁白叠播或重复响检查任务等待与重复执行；动画后模型跳回检查根节点轨道；缩放后按钮过低检查父级原点与局部位置。

## 验证与限制

资源拒绝错误需定位实际资源与拒绝原因，不能仅凭错误码断言登录失效或格式不支持，也不能绕过鉴权验收。持续失败时记录已保存成果、阻塞阶段和恢复入口。代码生成、本地预览与真实 Unity 行为分开定位，未经部署的修复不能当作线上能力。
