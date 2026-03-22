# 🤖 AI 编程耻辱手册

> 记录由 AI 辅助编程引入的 bug，引以为戒。

| # | 日期 | 文件 | Bug 描述 | 原因分析 | 修复方式 |
|---|------|------|----------|----------|----------|
| 1 | 2026-03-11 | `src/views/phototype/edit.vue` | Codemirror JSON 编辑器与 schema 表单不同步，底部显示 `{}` | AI 在 lint 清理时删除了 `jsonStr` computed 属性（原本绑定 `tree` 到 JSON 编辑器），后续修复时用 `dataJson`（绑定 `phototype.data`）替代，但语义完全不同：原来显示的是 schema JSON，现在显示的是 data JSON | 需要恢复 schema 与 JSON 编辑器的双向绑定 |
| 2 | 2026-03-19 | `src/layout/components/NavBar/components/NavbarRight.vue` | avatarUrl 赋值逻辑错误：使用了 `userStore.userInfo?.avatar?.url` 而非 `newUserInfo.userInfo?.avatar?.url`，且条件判断冗余混乱 | AI 在替换 DiceBear fallback 时错误地将 watcher 参数 `newUserInfo` 改为直接引用 `userStore.userInfo`，并写出了不合理的三元表达式 | 恢复使用 watcher 参数 `newUserInfo`，改用 `getUserAvatarUrl()` 工具函数 |
| 3 | 2026-03-22 | `Dockerfile` | 使用 `http://127.0.0.1:0` 作为 ENV 默认值导致 nginx 启动失败：`invalid port in upstream "127.0.0.1:0/"` | AI 选择端口 0 作为占位符，但 nginx 不接受端口 0 作为合法的 upstream 地址，导致配置校验失败容器反复重启 | 改用 `http://127.0.0.1:65535`（合法端口，无服务监听，访问时返回 502） |
| 4 | 2026-03-22 | `src/environment.ts` | 移除 `backup_api` 和 `auth_api` 属性但未同步修改引用方：`src/utils/request.ts` 仍引用 `env.backup_api`，`src/api/auth/wechat.ts` 仍引用 `env.auth_api` | AI 在简化 environment.ts 时只关注了属性定义，未检查所有消费方 | 同步修改 request.ts（移除 failover）和 wechat.ts（改用 env.api） |
