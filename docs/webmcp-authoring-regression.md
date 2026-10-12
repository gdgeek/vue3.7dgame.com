# 固定 WebMCP 创作回归集

运行 `corepack pnpm run webmcp:test:authoring`。这是固定的分层自动回归入口，覆盖工具实现及前端 API 契约；所有文件也由现有 CI 的全量 Vitest 自动运行。服务端 MySQL 并发、真实 HTTP 丢响应测试在后端 CI 单独运行。它们不等同于一次真实站点浏览器端到端验收。

| 业务环节 | 自动回归文件（test/unit 下） | 必须保持的结果 |
| --- | --- | --- |
| 新建对象、查找、封面 | `services/webmcp/authoring-tools.spec.ts`、`api/v1/authoring-create.spec.ts` | ID／UUID／操作回执匹配；空回执或串回执不能当成功；不自动重发 |
| 上传与封面素材 | `services/webmcp/authoring-upload*.spec.ts` | 打开文件选择器不等于上传成功；按 uploadId 关联真实资源 |
| 页面适配与目标切换 | `services/webmcp/authoring-adapter.spec.ts` | 调用实际 API 适配层，保存正确对象，账号／页面切换不串写 |
| 脚本配置与保存 | `services/webmcp/script-block-tools.spec.ts`、`meta-script-tools.spec.ts`、`verse-script-tools.spec.ts` | 使用原抽屉工具，静态检查、暂存、确认、完成、查回执 |
| 依赖、任务、工程恢复 | `services/webmcp/authoring-advanced.spec.ts` | 前序结果引用、任务目标约束、新草稿恢复、引用重写、原数据不覆盖 |
| 刷新／中断恢复 | `services/webmcp/authoring-durable-task.spec.ts` | 重建客户端后列出／读取原任务；未提交草稿重新预览；已提交查原回执；并发抢占；进度保存丢响应；串操作回执拒绝 |
| 保存协议 | `api/v1/write-protocol.spec.ts` | 原操作 ID＋原版本；错误／丢失回执不报告成功 |
| AI 指南 | `services/webmcp/workflow-guide-tools.spec.ts` | 指南 1.5.0 与可发现路径一致 |

本轮前端全量验证：426 个文件、5639 项通过、3 项原有跳过；随后新增的两个恢复边界用例也通过（持久任务文件共 7 项）。固定回归入口总计 163 项。类型检查、改动源文件 ESLint／Prettier、生产构建通过。

## 发布前固定业务验收

在部署了本批后端和前端的独立开发场景执行同一任务：

> AI 新建一个实体和场景，选择可访问的已有素材，设置两者封面，打开原脚本抽屉配置并保存脚本，把实体加入场景，返回对象链接与保存回执；导出可编辑工程并恢复为新草稿，核对新旧映射和原对象未被覆盖。

记录实际版本、账号、对象 ID、操作 ID、回执与封面显示。分别在预览完成后、写入提交后及收到保存结果后刷新；使用任务列表和原 taskId 恢复。并发标签页只能有一个推进者，重复新建须复用原键和相同内容，不能换键。撤销对象权限后查回执应拒绝；双后端入口应一致。

本批尚未部署，因此上述本批开发环境完整业务验收和双入口核验仍待执行。上一批六项创作功能的独立场景验收不能替代本批持久化验收。

## 真实能力边界

持久任务暂停于浏览器关闭，需要再次 advance；不是后台自动队列。未知且未观察到回执的写入不会自动重放，需先核对。任务历史中的结果是客户端证据，不代替服务端保存回执或当前对象权限。上传仍需要用户选择文件。

`advance_project_restore` 使用自己的内存恢复进度，暂未接入通用持久任务。其新建请求已使用服务端幂等键，但刷新后仍需凭已保存的新旧映射和 UUID 核对，不能宣称工程恢复已支持跨会话全自动续办。完整资源文件备份和更深修改影响分析属于下一批。
