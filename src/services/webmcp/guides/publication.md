# 保存与场景发布

## 目的与前置条件

把已验证的编辑保存并发布到用户指定范围。先确认发布授权、当前对象、权限和依赖状态；查看指南不授权发布。实体、实体脚本、场景和场景脚本分别保存，不能假定一次操作保存全部依赖。

## 操作步骤

1. 检查各修改工具的状态、`persistence` 与 `editorAcknowledged`。`server_acknowledged` 表示服务器已响应；仍需通过页面重载或受支持的独立读取核对保存内容。切页前处理未保存修改。
2. 回到场景编辑页并重新发现工具。用 `xrugc_get_scene_editor_context` 确认目标，再读取 `xrugc_check_scene_resource_readiness` 和 `xrugc_check_scene_publication_readiness`，处理缺失引用与阻塞项。
3. 调用 `xrugc_stage_scene_publication`，核对具体场景和警告；用返回的 `draftId` 调用 `xrugc_complete_scene_publication`，等待页面用户确认；工具先返回 `operationId` 时，用 `xrugc_get_operation_status` 查询最终回执。不得将 `awaiting_confirmation` 或 `submitting` 当作成功。
4. 记录最终回执的 `snapshotId`、`publicationRevision`、`contentHash`、`verification`、`readBackVerified` 及 `refreshSucceeded`。通过 `xrugc_get_scene_publication` 查询当前发布状态；指定 `publicationRevision` 可独立读取对应不可变快照。刷新失败但已有服务器快照回执时，先读取状态，不重复发布。
5. 通过平台支持的独立查询验证发布版本与快照内容，再按 `acceptance` 验收。若没有独立查询能力，明确保留未验证状态。

## 验证与限制

元数据就绪不证明资源实际可加载。`readBackVerified: false` 不能解释为已独立核实发布；普通场景读取成功也不证明发布指针正确。不要仅凭快照编号是否变化判断版本。发布、保存和编辑器本地撤销不构成跨系统事务。草稿过期、取消或上下文变化后需重新暂存；`partial` 时先核对已经生效的部分。操作查询返回 `unknown`、`not_observed` 或网络错误时，不证明服务器没有执行，禁止盲目重放写入。
