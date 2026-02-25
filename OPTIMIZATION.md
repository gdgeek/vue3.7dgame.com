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

#### 1. Element Plus 图标真正按需自动导入（预计 -50KB）
- **当前状态**：`src/plugins/icons.ts` 手动注册 ~30 个图标
- **建议**：改用 `unplugin-vue-components` `IconsResolver` 实现按需自动导入（`<IEpEdit>` 格式）
- **注意**：需将全部模板中 `<Edit>`、`<Delete>` 等改为 `<IEpEdit>`、`<IEpDelete>`，改动量较大
- **相关文件**：`src/plugins/icons.ts`、`vite.config.ts`、所有使用图标组件的 `.vue` 文件

#### 2. 新增图标漏注册风险
- **当前状态**：新页面使用新图标时若忘记加入 `src/plugins/icons.ts`，图标不显示但不报错
- **建议**：添加脚本扫描模板中用到的图标组件名，与 `icons.ts` 中注册列表做 diff，集成到 CI

### 中等优先级

#### 3. 重复的弹窗模式（MetaDialog / PrefabDialog / VerseDialog）
- **位置**：`src/components/MrPP/MetaDialog.vue`（289行）、`PrefabDialog.vue`（308行）、`VerseDialog.vue`（250行）
- **问题**：三者共享约 80% 代码（瀑布流网格 + 搜索 + 分页）
- **建议**：提取 `useDialogList<T>` composable，减少约 200 行重复代码

#### 4. CSS 主题文件拆分（`theme-styles.scss` 9648 行）
- **位置**：`src/styles/themes/theme-styles.scss`
- **问题**：全部打入初始 CSS bundle
- **建议**：按路由模块拆分，配合 Vite CSS code splitting 按需加载
- **预计收益**：初始 CSS 减少 30–40%，改动量较大，需完整回归测试

#### 5. `element-plus/dist/index.css` 全量样式
- **位置**：`src/main.ts` 第 84 行
- **问题**：导入完整 Element Plus 样式（包含未使用的组件样式）
- **建议**：删除全量导入，依赖 `ElementPlusResolver` 按需加载样式
- **风险**：overlay、scrollbar 等全局样式可能依赖此文件，需仔细测试

### 低优先级

#### 6. 大文件拆分（>800 行）
以下文件过大，可拆分为子组件或 composable：

| 文件 | 行数 | 建议 |
|------|------|------|
| `src/views/meta/ScenePlayer.vue` | 2053 | 提取渲染逻辑、工具栏、面板为子组件 |
| `src/views/meta/script.vue` | 1735 | 提取逻辑为 composable |
| `src/views/privacy-policy/index.vue` | 1707 | 静态内容，按章节拆分 |
| `src/views/verse/script.vue` | 1593 | 与 meta/script.vue 有大量相似逻辑，可共用 |
| `src/views/meta-verse/index.vue` | 1176 | 提取弹窗和列表为子组件 |
| `src/views/audio/tts.vue` | 992 | 大型功能页面，可按区域拆分 |
| `src/views/settings/edit.vue` | 939 | 各表单区块可拆分 |

#### 7. `useTheme` composable 批量 DOM 操作优化
- **位置**：`src/composables/useTheme.ts`（380行）
- **问题**：每次切换主题会对 100+ 个 CSS 变量逐一调用 `setProperty`
- **建议**：用 `cssText` 或临时 `<style>` 标签批量写入，减少重绘次数

#### 8. `src/styles/variables.module.scss` 使用情况
- 该文件在 `.scss` 文件中无 `@use`/`@import`，需确认是否只在 `.ts`/`.vue` 的 CSS Modules 中使用
- 若已无使用，可删除

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
