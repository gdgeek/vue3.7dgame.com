# 多语言缺失扫描结果与修改计划

## 问题根因
之前的图标迁移（Material Symbols → FontAwesome）重写了大量组件模板，新写的文本直接用了中文硬编码，没有使用 `$t()` / `t()` 国际化函数。

## 扫描结果汇总

| 文件 | 硬编码数量 | 优先级 |
|------|-----------|--------|
| SidebarLeft.vue | 36 | P0 - 每个用户都看到 |
| UserDropdown.vue | 10 | P0 |
| HeaderActions.vue | 3 | P0 |
| PageActionBar.vue | 11 | P1 - 通用组件 |
| StandardUploadDialog.vue | 11 | P1 |
| DetailPanel.vue | 10 | P1 |
| ViewContainer.vue | 4 | P1 |
| PagePagination.vue | 3 | P1 |
| PageFilter.vue | 2 | P1 |
| ThemeSwitcher.vue | 4 | P1 |
| ConfirmDialog.vue | 3 | P1 |
| StandardCard.vue | 1 | P2 |
| EmptyState.vue | 1 | P2 |
| QRCodeDialog.vue | 2 | P2 |
| QuickStart.vue | 1 | P2 |
| **总计** | **~102** | |

已完成国际化（无需处理）：Message.vue、HomeHeader.vue、logout/index.vue

---

## 修改计划

### Phase 1: 补充 i18n key 定义

在 `zh-CN/common.ts` 新增 `sidebar` 和 `ui` 两个命名空间，覆盖所有缺失文本。
很多 key 在 `route.ts` 中已有（如场景、校园管理等），可直接复用 `$t('route.xxx')`，无需重复定义。
`common.ts` 已有 `confirm`、`cancel`、`noData`、`delete` 等通用 key，优先复用。

需要新增的 key 分两类：
- `sidebar.*` — 侧边栏菜单专用（主页、素材库、实体、AI创作、场景、校园管理、管理中心、退出登录等）
- `ui.*` — 通用 UI 文本（个人设置、退出确认、搜索、全选、批量操作、分页、上传、主题切换等）

### Phase 2: 替换 SidebarLeft.vue（P0，36处）
所有菜单文字 → `$t('sidebar.xxx')` 或复用 `$t('route.xxx')`

### Phase 3: 替换 UserDropdown.vue + HeaderActions.vue（P0，13处）
用户菜单、退出确认、title 属性 → `$t('ui.xxx')`

### Phase 4: 替换 StandardPage 组件（P1，42处）
PageActionBar、DetailPanel、ViewContainer、PagePagination、PageFilter、StandardUploadDialog、StandardCard、EmptyState

### Phase 5: 替换 ThemeSwitcher + ConfirmDialog（P1，7处）

### Phase 6: 替换 QRCodeDialog + QuickStart（P2，3处）

### Phase 7: 同步其他 4 个语言文件
en-US、ja-JP、th-TH、zh-TW 各自翻译对应 key

---

## 各文件详细硬编码清单

### SidebarLeft.vue（36处）
- 不加班AR创作平台（fallback）、主页、素材库、模型、图片、音频、视频
- 实体、AI 创作、场景、自己创造、系统推荐
- 校园管理、学校管理、老师管理、学生管理
- 管理中心、用户管理、预制体管理
- 退出登录、确定要退出登录吗？、退出后需要重新登录...、取消

### UserDropdown.vue（10处）
- 个人设置、退出登录、确定要退出登录吗？、退出后需要重新登录...、取消
- 用户（fallback）、管理员账户、普通账户

### HeaderActions.vue（3处）
- 全屏、切换主题、语言（title 属性）

### PageActionBar.vue（11处）
- 个已选择、搜索...、取消全选、全选本页、批量下载、批量删除、取消
- 时间、名称（排序）、网格视图、列表视图

### StandardUploadDialog.vue（11处）
- 上传资源、拖拽文件到此处或点击浏览、支持多个文件同时上传、浏览文件
- 支持格式、单个文件大小、最大 xxxMB
- 正在校验文件...、正在上传文件...、正在保存资源...、准备中...

### DetailPanel.vue（10处）
- 资源详情、取消、保存、复制、删除、下载、删除此资源、在编辑器中使用

### ViewContainer.vue（4处）
- 名称、大小、修改日期、暂无数据

### PagePagination.vue（3处）
- 上一页、下一页、第x页/共x页

### PageFilter.vue（2处）
- 筛选、清除筛选

### ThemeSwitcher.vue（4处）
- 界面风格、主题色、自定义、重置

### ConfirmDialog.vue（3处）
- 确认（title默认值）、确认（confirmText默认值）、取消（cancelText默认值）

### StandardCard.vue（1处）
- 查看信息

### EmptyState.vue（1处）
- 暂无数据

### QRCodeDialog.vue（2处）
- 请使用手机扫描二维码登录、打开APP扫描二维码快速登录

### QuickStart.vue（1处）
- 立即
