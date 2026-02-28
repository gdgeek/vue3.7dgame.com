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

#### ~~4. CSS 主题文件拆分（`theme-styles.scss` 9648 行）~~ ✅ 已完成（2026-02-28）
- 按语义拆分为 14 个分块文件，存放于 `src/styles/themes/parts/`
- 主入口 `theme-styles.scss` 改写为 `@use` 汇总导入文件，构建验证通过

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
| `src/views/introduce/components/About.vue` | 1348 | 主要是静态轮播内容，拆分为 slide 数据 + 渲染组件 |
| `src/views/web/components/News/index.vue` | 1087 | 抽取 NewsCard、NewsList 为独立组件 |
| `src/views/web/components/Hero.vue` | 1052 | 拆分 hero sections |
| `src/views/verse/ScenePlayer.vue` | 809 | meta/ScenePlayer 的复制版，考虑合并为通用组件 |

> 注：`src/views/privacy-policy/index.vue` 已于 2026-02-27 重构，拆分为子组件并添加了 100% 测试覆盖。

#### ~~7. `useTheme` composable 批量 DOM 操作~~ ⏭ 评估后跳过
现代浏览器会自动批量处理同步 `setProperty` 调用（同一微任务内只触发一次重绘）。
用 `cssText` 替换的风险是清除 `:root` 上所有内联样式，用 `<style>` 标签的特异性低于内联样式。
实际收益极小，维护成本不低，不值得修改。

#### ~~8. `variables.module.scss` 使用确认~~ ✅ 已确认，无需操作（2026-02-25）
3 个布局组件通过 CSS Modules 导入使用：AppMain/index.vue、SidebarMenu.vue、SidebarMixTopMenu.vue。保留。

---

## 新发现的改进项（2026-02-27 扫描）

### 🔴 高优先级

#### ~~9. 死代码：`src/assets/js/fontok.ts`（945 行）~~ ✅ 已完成
- 文件已被删除（验证：2026-02-27 确认已不存在）

#### ~~10. `express` 出现在 production dependencies~~ ✅ 不存在
- 2026-02-27 核查：`package.json` 中无 `express` 依赖，描述有误，无需处理

#### ~~11. 重复的 ScenePlayer 组件~~ ✅ 已完成
- 已合并为共享组件，详见 commit: `refactor: merge duplicate ScenePlayer into shared component`

#### 12. `meta/script.vue` 与 `verse/script.vue` 逻辑重复 ⚠️
- **行数**：1736 + 1593 = 3329 行，高度相似
- **重复内容**：GLTF loader 初始化、场景通信、代码对话框逻辑、iframe 通信
- **建议**：提取公共逻辑为 `useSceneScript` composable，两个文件各自保留差异部分
- **预计收益**：每个文件减少 40–50% 行数

### 🟡 中优先级

#### ~~13. 全局错误处理缺失~~ ✅ 已完成（2026-02-27）
- 已在 `src/main.ts` 添加 `app.config.errorHandler` 和 `unhandledrejection` 监听，使用 `logger.error` 输出

#### 14. 路由布局组件未懒加载
- **问题**：`Structure`、`SimpleStructure`、`Empty` 等布局组件在路由文件顶部静态 import，会打入主 bundle
- **涉及文件**：`campus.ts`（SimpleStructure）、`home.ts`（Structure、Empty）、`verse.ts`（null 组件待查）
- **说明**：布局组件由于所有路由共用，懒加载收益有限，但应记录并评估

#### 15. `src/store/modules/availableVoices.ts`（1311 行）纯数据文件
- **问题**：1311 行的 TS 文件，全部是静态数据（音色列表映射），被打入主 bundle
- **建议**：转为 JSON 文件，在需要时异步 `import()`，或使用 Vite 的 `?raw` 导入
- **预计收益**：主 bundle 减少约 30–50 KB

#### 16. `highlight.js` 版本过旧（^10.7.3）
- **问题**：10.x 是 2021 年版本，11.x/12.x 已发布多年，旧版有已知 ReDoS 漏洞
- **操作**：`pnpm update highlight.js vue-hljs`，检查 API 兼容性
- **参考**：highlight.js v11+ 不再包含自动检测（`highlightAuto`），需调整用法

#### 17. 主要 views 完全没有测试
以下大型功能模块行数超过 1000 行但零测试覆盖：

| 模块 | 总行数 | 优先级 |
|------|-------|--------|
| `src/views/web/`（落地页）| 5336 行 | 中（主要是内容展示） |
| `src/views/campus/`（校园管理）| 1934 行 | 高（核心业务） |
| `src/views/meta-verse/`（元宇宙管理）| 1771 行 | 高（核心业务） |
| `src/views/introduce/`（产品介绍）| 1764 行 | 低（静态内容为主） |
| `src/views/settings/`（系统设置）| 1708 行 | 中 |
| `src/views/particle/`（粒子编辑器）| 1002 行 | 中 |
| `src/views/picture/`（图片管理）| 826 行 | 中 |
| `src/views/video/`（视频管理）| 869 行 | 中 |

### 🟢 低优先级

#### 18. `aos` 动画库仅在 `web/` 使用
- **现状**：`aos` 在 `bbs.vue` 和 `buy.vue` 中使用，每次都重新 `import "aos/dist/aos.css"`
- **建议**：将 `aos` 加入 Vite `manualChunks`，避免重复打包；或评估是否用 CSS animation 替代
- **体积**：`aos` 约 6KB gzip

#### 19. `src/views/web/` 组件无国际化
- **问题**：落地页（Hero.vue、News/index.vue 等）包含大量硬编码中文内容
- **但是**：若落地页为纯中文产品页面，可能是设计决策而非 bug
- **操作**：与产品确认是否需要多语言落地页

#### 20. 缺少 CI/CD 自动化
- **现状**：无 GitHub Actions，测试仅手动运行
- **建议**：
  ```yaml
  # .github/workflows/ci.yml
  on: [push, pull_request]
  jobs:
    test:
      steps:
        - run: pnpm run type-check
        - run: pnpm run lint:eslint
        - run: pnpm run test:run
  ```
- **价值**：防止合并破坏性变更，确保 TypeScript any = 0 的状态持续维护

#### 21. 缺少错误监控（Sentry）
- **现状**：生产环境无异常监控，问题靠用户反馈发现
- **建议**：接入 Sentry 或类似服务
- **成本**：免费套餐通常够用

---

### 🔴 新增高优先级（来自深度扫描）

#### ~~22. 6 个资源上传页面完全重复~~ ✅ 不存在
- 2026-02-27 核查：所有 `upload.vue` 文件已被删除，无需处理

#### 23. 6 个资源查看页面差异过大，不适合合并 ⏭ 评估后跳过
- **实际情况**：audio/video/picture/particle/polygen/voxel 的 view.vue 每个都有完全不同的预览逻辑（音频播放、视频帧截图、图片尺寸检测、3D 渲染等），强行合并风险高、收益有限

#### ~~24. Token 绕过 Store 直接写 localStorage~~ ✅ 不存在
- 2026-02-27 核查：login/register 均通过 `user.ts` store 中的 `Token.setToken()` 写入，无明文 localStorage 直写

---

### 🟡 新增中优先级（来自深度扫描）

#### ~~25. campus/teacher.vue 与 campus/student.vue 高度重复~~ ✅ 已完成（2026-02-28）
- 新建 `src/composables/useCampusMemberList.ts`，提取分页、详情面板、删除确认共有逻辑
- teacher.vue 和 student.vue 脚本部分从 ~130 行各减至 ~50 行，模板/样式保持各自差异

#### 26. API 层导出风格不一致
- **问题**：约 30% 的 API 文件使用 `export default { ... }` 对象，70% 使用 `export const` 函数
- **不一致文件**：`src/api/v1/user.ts`、`src/api/auth/wechat.ts`、`src/api/user/server.ts`、`src/api/v1/email.ts`
- **影响**：IDE 自动导入、tree-shaking 效果、代码风格一致性
- **建议**：统一改为 `export const` 具名导出

#### ~~27. `helper.ts` 与 `utilityFunctions.ts` 功能可能重叠~~ ⏭ 评估后跳过（2026-02-28）
- 两个文件职责完全不同：`helper.ts` 处理 URL/IP/Domain 操作，`utilityFunctions.ts` 处理日期格式化/文件大小/视频封面
- 无功能重叠，无需合并

#### ~~28. `rollup-plugin-visualizer` 与 `vite-plugin-visualizer` 重复引入~~ ✅ 不存在
- 2026-02-27 核查：项目只有 `rollup-plugin-visualizer`（在 vite.config.ts 中正常使用），无重复，无需处理

#### 29. `element-resize-detector` 已停止维护
- **版本**：^1.2.4（最后更新 2021 年）
- **建议**：替换为原生 `ResizeObserver` API（现代浏览器均已支持），或使用 `@vueuse/core` 的 `useResizeObserver`

#### 30. `availableVoices.ts` 中文情感数据未国际化
- **文件**：`src/store/modules/availableVoices.ts`（1311 行）
- **问题**：情感名称（"悲伤"、"高兴"、"生气" 等）硬编码中文，`emotionMap` 作为显示用字符串
- **建议**：将中文 key 移至 `src/lang/` 翻译文件，`emotionMap` 仅存储英文 key → API 参数的映射
- **顺带**：评估能否将纯数据转为 JSON 文件按需加载，减少主 bundle 体积

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
