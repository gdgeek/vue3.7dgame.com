# AI 创作与工程恢复

先调用 `xrugc_get_authoring_capabilities`，再通过 `xrugc_get_authoring_tool_schema` 查询当前工具真实参数。工具清单随登录、对象页面和脚本抽屉变化。对象级权限由 API 再检查；不可将菜单权限当作可写任意对象的保证。

## 从零制作

1. 搜索已有素材，使用 `xrugc_get_asset_metadata` 核对类型、文件及动画元数据。`animationSource=unknown` 表示没有可信动画清单，不能编造名称。
2. `xrugc_stage_authoring_creation` 创建实体／场景草稿，`xrugc_complete_authoring_draft` 请求确认，再查询 `xrugc_get_authoring_operation`。记录 ID、UUID 和操作结果，不把打开确认框当作创建成功。
3. 强烈建议选择清晰贴题的封面。可生图则生成，否则选可用网络图片或实际截图。上传走 `start_authoring_upload`，立即取得 uploadId 和 awaiting_confirmation，再确认页面并选择文件；用 `get_authoring_upload` 的 completedResourceIds 核对资源 ID。opened=false 的等待确认状态不是上传失败；closed 只表示窗口关闭，也不是成功凭据。封面绑定使用图片资源 ID，由工具转换为原图文件 ID；完成后回读关联，另查页面图片实际显示。
4. 打开实体，等待上下文 ready。查询素材放置工具的 schema，stage→complete→查询保存回执。打开原有脚本抽屉，在真实积木目录中选类型与字段，使用模板预览或批量积木编辑，静态校验后完成保存。
5. 打开场景，用场景实体放置工具加入已保存实体，核对保存回执。交付对象链接、ID、封面核验结果和保存回执；运行与发布是单独操作。

## 依赖与影响

`xrugc_inspect_authoring_dependencies` 检查已保存的场景→实体→素材及引用位置；`xrugc_find_entity_usage` 按关联候选分页，区分场景有实例、只有历史关联、结构无法确定。先读 coverage、truncated、hasMore，不能从有限结果宣称全站无影响。无权读取的关联场景不会返回 ID 或标题。动态脚本引用及运行行为不在结构扫描保证内。

## 逐步任务

`xrugc_preview_authoring_task` 最多 30 步，只预览；`xrugc_advance_authoring_task` 每次执行一步或查询原操作。输入引用例如 `{"$ref":"draft.draftId"}`，新建完成结果可引用 `{"$ref":"create.result.id"}`。只能引用已经完成的前序步骤；页面编辑步骤必须指定目标 kind/id。工具缺失、目标不符或编辑器加载时等待。

已确认写入仍保留原页面确认与服务端版本检查。任务是部分提交，不是跨对象事务；失败后先核对哪些步骤已完成。unknown 必须查原操作，禁止重跑创建；创建响应丢失时，搜索对象并用 `xrugc_reconcile_authoring_creation` 对照原 UUID。任务跨 SPA 页面保留，但刷新不保留；请把对象 ID 和回执记录在会话中。

## 脚本模板与诊断

`xrugc_get_script_templates` 提供语句链、事件加动作链两种参数化模板，参数取自当前编辑器目录。`xrugc_preview_script_template` 只生成通过现有编辑器校验的批处理草稿，仍须 `xrugc_complete_script_block_batch` 保存。`xrugc_diagnose_authoring_script` 合并积木链接检查和原编辑器的节点、信号与生成代码静态诊断；建议不能代替真实运行验收。

## 工程备份与恢复

`xrugc_export_editable_project` 读取已保存数据、Blockly 源、代码和依赖版本，重复检查对象版本并计算 SHA-256。默认返回有界摘要与当前账号的内存 backupId；持久备份用 download=true 下载 JSON，或 includeBackup=true 获取包正文。一次最多 20 个实体、200 个资源、2 MB JSON；不包含未保存编辑内容、资源二进制或权限凭据，也不承诺数据库原子快照。

`xrugc_stage_project_restore` 接收 backupId 或备份 JSON（二选一），校验哈希及素材可访问性、文件 ID 和 MD5；`xrugc_advance_project_restore` 逐步创建全新草稿。原对象不被覆盖；场景 meta_id 指向新实体，节点内部 ID 保留以维持 Blockly 引用。恢复保留 Blockly 源，清空派生 JS/Lua，需在原脚本抽屉重新生成并保存。封面须通过封面工具重新绑定，不能直接信任导入的旧文件 ID。

恢复结果包括新旧对象映射与保存回执。unknown 新建只允许用 `xrugc_reconcile_project_restore` 对照已知 UUID；unknown 保存查询原回执，不自动重写。恢复进度仅存在当前标签页内存；中断后保留已创建的新草稿供核对，不自动删除或回滚。
