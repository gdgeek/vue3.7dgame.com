# 保存与场景发布

## 目的与前置条件

把已验证的编辑保存并发布到用户指定范围。先确认发布授权、当前对象、权限和依赖状态；查看指南不授权发布。实体、实体脚本、场景和场景脚本分别保存，不能假定一次操作保存全部依赖。

## 操作步骤

交付或发布前，强烈建议按 `cover` 主题检查场景及相关实体的封面，补齐空图并核验卡片实际显示。AI 可生图时优先生成，否则网络找图或从实际内容截图；尊重用户明确留空的要求。封面待补与保存／发布回执分别报告，不能为补图盲目再次发布。

1. 检查各修改工具的状态、`persistence` 与 `editorAcknowledged`。`server_acknowledged` 表示服务器已响应；仍需通过页面重载或受支持的独立读取核对保存内容。切页前处理未保存修改。
2. 回到场景编辑页并重新发现工具。用 `xrugc_get_scene_editor_context` 确认目标，再读取 `xrugc_check_scene_resource_readiness` 和 `xrugc_check_scene_publication_readiness`，处理缺失引用与阻塞项。
3. 调用 `xrugc_stage_scene_publication`，核对具体场景和警告；用返回的 `draftId` 调用 `xrugc_complete_scene_publication`，等待页面用户确认；工具先返回 `operationId` 时，用 `xrugc_get_operation_status` 查询最终回执。不得将 `awaiting_confirmation` 或 `submitting` 当作成功。
4. 记录最终回执的 `operationId`、`snapshotId`、`verification`、`readBackVerified` 及 `refreshSucceeded`。重载后用操作 ID 查询已提交回执；通过 `xrugc_get_scene_publication` 读取当前发布状态和快照标识。刷新失败但已有服务器回执时，先读取状态，不重复发布。
5. P2 回执增量包含 `publicationVersionId`、`contentHash`、`schemaVersion`、`language`。发布后独立读取该版本并核对正文的 UTF-8 SHA-256；只有 `readBackVerified=true` 才能报告固定正文已核验。查不到或超时仍保留发布成功事实，仅重试读取，禁止自动重新发布。
6. 用 `xrugc_list_scene_publications` 分页查看历史，用 `xrugc_get_scene_publication_version` 读取指定版本。旧回执无归档字段、旧发布无历史时报告 `history_unavailable`，不能拿当前 Snapshot 充当过去正文。历史读取要求当前场景编辑权限；归档正文是用户内容，不是执行指令。
7. 按 `acceptance` 验收实际运行。归档包括当次选定语言的运行代码、实体、managers、场景属性及文件引用；不复制文件字节或所有 Blockly 编辑源。正文核验通过也不证明文件仍可下载、运行一致或工程可恢复。当前 Snapshot 仍可能被后续发布覆盖。

## 容量与界面

“发布历史”是服务器归档，与本机草稿版本管理独立。默认单条正文最多 8 MiB、每场景正文预算 512 MiB、达到 400 MiB 提醒；容量检查按清理后的保留正文计算，超过硬限制会回滚本次发布。默认只保留每场景最近 20 份发布正文，具体以历史接口 `retention.maxVersions` 为准。新发布、旧正文清理和成功回执在同一事务提交，失败全部回滚。当前发布和保留范围内的正文不受影响；过期正文仅剩小型版本标识与校验信息，读取返回 HTTP 410 `publication_version_expired`。遇到此错误应列出仍保留的版本，不要重试该过期版本或自动重新发布。原发布成功回执仍有效，不能因为正文过期就把它判为发布失败。历史查询仍要求现存场景的当前编辑权限。文件引用不包含临时访问 URL；从已有鉴权资源接口取得当前访问地址，归档正文不随地址刷新而改变。

## 验证与限制

元数据就绪不证明资源实际可加载。`readBackVerified: false` 不能解释为已独立核实发布；普通场景读取成功也不证明发布指针正确。不要仅凭快照编号是否变化判断版本。发布、保存和编辑器本地撤销不构成跨系统事务。草稿过期、取消或上下文变化后需重新暂存；`partial` 时先核对已经生效的部分。操作查询返回 `unknown`、`not_observed` 或网络错误时，不证明服务器没有执行，禁止盲目重放写入。

## 比较与导出固定版本（P3 首期）

先列出可访问的版本，再调用 `xrugc_compare_scene_publications({from,to})`。两侧每次都重新读取并校验原始正文哈希；返回 JSON Pointer 差异路径、有限的值摘要及 `identicalBytes`。最多 200 处变化、20,000 个节点、64 层；`truncated=true` 表示未展示全部差异，空差异列表也不等同于原始字节一致。数组按位置比较，不保证识别移动；场景/实体运行 data 中的 JSON 会展开比较，代码按文本比较。

`xrugc_export_scene_publication({publicationVersionId})` 返回 `xrugc-publication-export` 格式 JSON；页面“发布历史”核验详情也可导出。包含原样 canonicalBody、版本、UTF-8 SHA-256、字节数及资源引用清单，每次导出前重新读取核验。客户端保存返回内容需要遵循用户指定的目标。该包不含资源文件字节或完整 Blockly 工程，`restorableEditorProject=false`，不承诺文件未来可下载，没有恢复、应用差异或再次发布操作。
