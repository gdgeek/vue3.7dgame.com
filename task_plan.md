# Task: i18n 多语言修复

## 目标
修复图标迁移后丢失的 i18n 国际化，将 ~102 处硬编码中文替换为 `$t()` 调用。

## 状态: `in_progress`

---

## Phase 1: 补充 i18n key 定义 (`in_progress`)
在 `zh-CN/common.ts` 新增 `sidebar.*` 和 `ui.*` 命名空间。

## Phase 2: 替换 SidebarLeft.vue (`pending`)
36 处硬编码中文 → `$t()` 调用

## Phase 3: 替换 UserDropdown.vue + HeaderActions.vue (`pending`)
13 处

## Phase 4: 替换 StandardPage 组件 (`pending`)
42 处 — PageActionBar, DetailPanel, ViewContainer, PagePagination, PageFilter, StandardUploadDialog, StandardCard, EmptyState

## Phase 5: 替换 ThemeSwitcher + ConfirmDialog (`pending`)
7 处

## Phase 6: 替换 QRCodeDialog + QuickStart (`pending`)
3 处

## Phase 7: 同步其他 4 个语言文件 (`pending`)
en-US, ja-JP, th-TH, zh-TW
