# Task: Material Symbols → FontAwesome 迁移

## 目标
将所有 `material-symbols-outlined` 图标替换为 FontAwesome，去掉 Google CDN 依赖，解决图标加载前显示文字的问题。

## 状态: `complete` ✅

---

## Phase 1: 注册所有需要的 FA 图标 (`complete` ✅)
在 `src/main.ts` 中 `library.add()` 添加所有需要的图标导入（~60个图标）。

## Phase 2: 替换侧边栏图标 (`complete` ✅)
文件: `src/layout/components/Sidebar/SidebarLeft.vue`

## Phase 3: 替换 NavBar 图标 (`complete` ✅)
文件: `HeaderActions.vue`, `UserDropdown.vue`

## Phase 4: 替换各 views 和 components 页面图标 (`complete` ✅)
- 14 个 view 文件
- 16 个 component 文件
- 所有 `<span class="material-symbols-outlined">xxx</span>` → `<font-awesome-icon :icon="['fas', 'xxx']" />`

## Phase 5: 清理 CSS 中的 `.material-symbols-outlined` 样式 (`complete` ✅)
- `src/styles/ar-platform.scss` — 7 处替换为 `.svg-inline--fa`
- `src/styles/themes/theme-styles.scss` — 51 处替换为 `.svg-inline--fa`（sed 批量替换）

## Phase 6: 去掉 CDN 引用和字体文件 (`complete` ✅)
- `index.html`: 删除 3 个 Google Fonts CDN `<link>` 标签
- 删除 `src/assets/fonts/material-symbols.css`
- 删除 `src/assets/fonts/material-symbols-outlined.woff2`
- `pnpm remove @material-symbols/font-400`

## Phase 7: 处理动态图标绑定 (`complete` ✅)
StandardCard/EmptyState/DetailPanel 的 prop 类型已改为 `string | string[]`，支持 FA 数组格式。

## 最终验证
`grep -r 'material-symbols' src/ index.html` — 零匹配 ✅
