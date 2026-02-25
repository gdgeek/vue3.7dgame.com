# 优化记录

本文件记录已完成的优化和待办优化事项，避免每次重复扫描。

---

## 已完成优化

### Bundle 体积

| 日期 | 内容 | 效果 |
|------|------|------|
| 2026-02-25 | 将 `json-schema-editor-vue3` 从全局注册改为 `phototype/edit.vue` 本地注册 | 主 chunk: 1794kb → 1332kb (-462kb) |
| 2026-02-25 | 删除未使用的 `vue-iframes` 全局插件（模板中从未出现 `<v-iframe>`） | 轻微减小主 chunk |
| 2026-02-25 | 从 `vite.config.ts` manualChunks 删除 `echarts`（从未被导入） | 无实际影响，清理误导性配置 |
| 2026-02-25 | 将 `@element-plus/icons-vue` 从 `import *` 全量注册改为只注册 ~30 个实际使用的图标 | element-plus chunk: 740kb → 615kb (-125kb) |
| 2026-02-25 | 将 `animate.css`（72KB）替换为 `src/styles/animate.css`（~0.5KB，仅含使用的 4 个类） | 主 CSS: 905kb → 577kb (-328kb) |
| 2026-02-25 | 删除 `main.ts` 中重复的 `vue-cropper/dist/index.css`（MrPPCropper.vue 和 settings/edit.vue 已各自导入） | 减少重复 CSS |

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

#### 1. Element Plus 图标按需自动导入（预计减少 element-plus chunk ~50KB）
当前状态：通过 `src/plugins/icons.ts` 手动注册 ~30 个图标。
建议：改用 `unplugin-vue-components` + `ElementPlusResolver` 配合 `IconsResolver` 实现真正的按需自动导入。
需要将所有模板中的 `<Edit>`、`<Delete>` 等用法改为 `<IEpEdit>`、`<IEpDelete>` 格式，改动量较大。
相关文件：`src/plugins/icons.ts`, `vite.config.ts`

### 中等优先级

#### 2. `setupElIcons` 内图标补全检查
当前 `src/plugins/icons.ts` 仅注册了扫描到的 ~30 个图标。若后续新增页面使用了新图标但忘记添加到此文件，会出现图标不显示的问题（但不会报错）。
建议：在 CI 或 pre-commit 中加一个检查脚本。

#### 3. CSS 主题文件拆分（`theme-styles.scss` 9648 行）
`src/styles/themes/theme-styles.scss` 共 9648 行，全部打入初始 CSS bundle。
建议：按路由模块拆分，配合 Vite 的 CSS code splitting 实现按需加载。
预计可减少初始 CSS 约 30–40%，但改动量较大，需完整测试。

#### 4. `element-plus/dist/index.css` 与组件按需导入
`main.ts` 中 `import "element-plus/dist/index.css"` 会导入完整 Element Plus 样式。
由于项目已使用 `unplugin-vue-components` 的 `ElementPlusResolver`，理论上可以删除此全量导入，让样式随组件按需加载。
但需要谨慎测试，部分全局样式（如 overlay、scrollbar）可能依赖此文件。

### 低优先级

#### 5. `animate.css` 依赖可完全移除
`package.json` 中的 `animate.css` 依赖已不再使用（CSS 已内联到 `src/styles/animate.css`）。
可运行 `pnpm remove animate.css` 删除依赖。

#### 6. `vue-iframes` 依赖可完全移除
已从 `main.ts` 删除 `app.use(VueIframe)`，但 `package.json` 中仍有 `vue-iframes` 依赖和类型声明文件 `src/typings/vue-iframes.d.ts`。
可运行 `pnpm remove vue-iframes` 并删除类型文件。

#### 7. `echarts` 依赖审查
`package.json` 中存在 `echarts` 依赖，但在 `src/` 目录中从未被导入。
若确认不需要，可运行 `pnpm remove echarts` 删除。

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
