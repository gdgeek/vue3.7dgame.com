# 优化记录

本文件记录已完成的优化和待办优化事项，避免每次重复扫描。

---

## 已完成优化

### Bundle 体积

| 日期 | 内容 | 效果 |
|------|------|------|
| 2026-02-25 | 将 `json-schema-editor-vue3` 从全局注册改为 `phototype/edit.vue` 本地注册 | 主 chunk: 1794kb → 1332kb (-462kb) |
| 2026-02-25 | 删除未使用的 `vue-iframes` 全局插件（模板中从未出现 `<v-iframe>`） | 轻微减小主 chunk |
| 2026-02-25 | 从 `vite.config.ts` manualChunks 删除 `echarts`（从未被导入） | 清理误导性配置 |
| 2026-02-25 | 将 `@element-plus/icons-vue` 从 `import *` 全量注册改为只注册 ~30 个实际使用的图标 | element-plus chunk: 740kb → 615kb (-125kb) |
| 2026-02-25 | 将 `animate.css`（72KB）替换为 `src/styles/animate.css`（~0.5KB，仅含使用的 4 个类） | 主 CSS: 905kb → 577kb (-328kb) |
| 2026-02-25 | 删除 `main.ts` 中重复的 `vue-cropper/dist/index.css` | 减少重复 CSS |

### 依赖清理

| 日期 | 内容 |
|------|------|
| 2026-02-25 | `pnpm remove animate.css echarts vue-iframes generate-schema https-localhost vue-3d-loader` |
| 2026-02-25 | `pnpm remove -D motion-v opencc-js` |
| 2026-02-25 | 删除 `src/typings/vue-iframes.d.ts`（已随 vue-iframes 包一同移除） |

### 无用文件清理

| 日期 | 内容 |
|------|------|
| 2026-02-25 | 删除 3 个从未被任何文件 `@use`/`@import` 的 SCSS 文件：`sandtable.scss`、`screenstyle.scss`、`responsive-style.scss` |
| 2026-02-25 | 删除空文件（0 行）且从未被导入的 `src/components/AnimatedTitle.vue` |

### I18n / 翻译

| 日期 | 内容 |
|------|------|
| 2026-02-25 | 删除所有 5 个语言包中的 299 个未使用翻译键 |
| 2026-02-25 | 修复 `en-US/resource.ts` 中的拼写错误："Preprocessing in progres" → "Preprocessing in progress" |

### 代码质量

| 日期 | 内容 |
|------|------|
| 2026-02-25 | 为 Window 接口添加运行时注入变量的类型定义（`fix(types)`） |

---

## 待办优化

### 高优先级

#### ~~1. Element Plus 图标按需导入~~ ✅ 已完成（2026-02-25）
删除 `src/plugins/icons.ts` 全局注册，改为在各使用文件中本地 `import { X } from "@element-plus/icons-vue"`。
额外修复：`web/index.vue` 中字符串动态组件 `<component :is="'Close'">` 原本失效，已改为对象引用。
涉及文件：11 个 `.vue` 文件 + `src/plugins/index.ts`。

#### ~~2. 新增图标漏导入检查脚本~~ ✅ 已完成（2026-02-25）
`scripts/check-icons.js` + `pnpm run check:icons`：扫描所有模板，找出使用了 EP 图标但未在同文件 `<script>` 中 import 的情况。

### 中等优先级

#### ~~3. 重复的弹窗模式~~ ✅ 已完成（2026-02-25）
新建 `src/composables/useDialogList.ts`，提取公共的 `active` 状态（items/sorted/searched/pagination）、`dialogVisible`、`sort/search/clearSearched/handleCurrentChange/openDialog` 方法。
MetaDialog（290行→195行）、PrefabDialog（308行→210行）、VerseDialog（250行→175行）均已重构。
`ResourceDialog.vue` 使用略不同的独立 refs 风格，暂未重构，可后续跟进。

#### 4. CSS 主题文件拆分（`theme-styles.scss` 9648 行）⏳ 待处理
- **位置**：`src/styles/themes/theme-styles.scss`
- **状态**：2026-02-27 确认仍为 9648 行，未处理
- **建议**：按路由模块拆分，配合 Vite CSS code splitting 按需加载
- **预计收益**：初始 CSS 减少 30–40%，改动量较大，需完整回归测试

#### 5. `element-plus/dist/index.css` 全量样式⏳ 待处理
- **位置**：`src/main.ts` 第 84 行
- **状态**：2026-02-27 确认仍为全量导入
- **建议**：删除全量导入，依赖 `ElementPlusResolver` 按需加载样式
- **风险**：overlay、scrollbar 等全局样式可能依赖此文件，需仔细测试

### 低优先级

#### 6. 大文件拆分（>800 行）⏳ 待处理
以下文件过大，可拆分为子组件或 composable（2026-02-27 实测行数）：

| 文件 | 行数 | 建议 |
|------|------|------|
| `src/views/meta/ScenePlayer.vue` | 2053 | 提取渲染逻辑、工具栏、面板为子组件 |
| `src/views/meta/script.vue` | 1736 | 提取逻辑为 composable |
| `src/views/verse/script.vue` | 1593 | 与 meta/script.vue 有大量相似逻辑，可共用 |
| `src/views/meta-verse/index.vue` | 1177 | 提取弹窗和列表为子组件 |
| `src/views/audio/tts.vue` | 992 | 大型功能页面，可按区域拆分 |
| `src/views/settings/edit.vue` | 1256 | 各表单区块可拆分 |

> 注：`src/views/privacy-policy/index.vue` 已于 2026-02-27 重构，拆分为子组件并添加了 100% 测试覆盖。

#### ~~7. `useTheme` composable 批量 DOM 操作~~ ⏭ 评估后跳过
现代浏览器会自动批量处理同步 `setProperty` 调用（同一微任务内只触发一次重绘）。
用 `cssText` 替换的风险是清除 `:root` 上所有内联样式，用 `<style>` 标签的特异性低于内联样式。
实际收益极小，维护成本不低，不值得修改。

#### ~~8. `variables.module.scss` 使用确认~~ ✅ 已确认，无需操作（2026-02-25）
3 个布局组件通过 CSS Modules 导入使用：AppMain/index.vue、SidebarMenu.vue、SidebarMixTopMenu.vue。保留。

---

## Bundle 尺寸快照（2026-02-25 最新构建）

| Chunk | Raw | Gzip |
|-------|-----|------|
| index（主应用）| 1332 KB | 454 KB |
| element-plus | 615 KB | 197 KB |
| three.js | 669 KB | 172 KB |
| json-schema-editor（懒加载）| 439 KB | 135 KB |
| codemirror | 407 KB | 132 KB |
| 主 CSS | 577 KB | 74 KB |
| json-schema-editor CSS（懒加载）| 255 KB | 27 KB |
| fontawesome | 94 KB | 30 KB |
| vue-core | 196 KB | 72 KB |

> **对比基线（优化前）**：主 chunk 1794 KB / 主 CSS 905 KB
