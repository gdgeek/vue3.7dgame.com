# 场景脚本抽屉验收

## 当前验收：2026-09-12 抽屉工具栏精简

本次范围：仅调整嵌入式脚本抽屉。保存与版本历史移入标题栏，删除正文的场景编辑、运行场景、实体跳转入口；正文改为逻辑编辑／代码查看标签。独立脚本页保留现有布局与行为。

- source visual truth path: `/Users/dirui/Desktop/截屏2026-09-12 17.29.17.png`（456 × 142 px，图二按钮组）；`/Users/dirui/Desktop/截屏2026-09-12 17.53.31.png`（改造前的抽屉局部）。用户文字明确覆盖图一中的布局与入口，不把图一当作最终布局。
- Implementation URL: `http://127.0.0.1:3001/verse/scene?id=2307&lang=zh-CN&theme=modern-blue`。
- implementation screenshot path: CUA 当前任务内联截图「最终视觉对照与正文溢出检查」及「检查抽屉代码页状态」「检查版本历史弹窗」。CUA 返回截图字节并内联显示，本次未导出实施截图文件。
- Viewport / pixels: 847 × 803 CSS px；实施截图 847 × 803 px（1:1）。图二按钮组从 x=225、y=27 裁切 166 × 80 px，归一为 83 × 40 px，用于与现有 82 × 40 CSS px 按钮组对照。原图完整视口未知，2:1 为依据现有组件高度推定的密度，不据此宣称整页像素复刻。
- State: 已登录，场景「鲸须」，modern-blue 主题；分别查看逻辑、Lua、JavaScript、版本历史和关闭后的场景。
- Full-view comparison evidence: 最终 CUA 调用同时显示归一后的图二按钮组与完整实施截图；标题、操作、标签、工作区层级符合用户要求，原场景在遮罩下保留。
- Focused region comparison evidence: 同一输入中的 83 × 40 参考组与右上角 82 × 40 实施组，均为浅蓝主操作段、白色历史段、细分隔线与 10px 圆角。播放图标按用户要求替换为保存图标，1px 宽度差源于参考裁切外缘，不是新增布局差异。

### Findings 与修复记录

- [P2，已修复] 首轮实际截图中主标签出现在 Blockly 下方。Element Plus 的 DOM 顺序为 content 在 header 前；为嵌入模式的直接 header 设置 `order: -1`。后续同视口截图确认标签位于工作区上方。
- 当前未发现本次范围内待修复的 P0/P1/P2。正文高度与 scrollHeight 均为 712，宽度与 scrollWidth 均为 777，没有多余外层滚动或底部裁切。

### 五项视觉检查

- Fonts/typography: 沿用产品字体和主题；标题 20px、标签沿用 Element Plus 样式，标题截断不挤压右侧操作。
- Spacing/layout rhythm: 标题栏 16px / 24px 内边距；操作组 82 × 40、圆角 10；正文只有两项主标签，工作区铺满剩余高度。
- Colors/tokens: 保存使用 primary-light / primary-dark，历史使用 text-secondary；实测启用时 opacity=1，保存前景 rgb(0,119,170)，历史 rgb(100,116,139)。
- Image quality/assets: 复用 Font Awesome 的保存、历史图标，未创建位图或仿制图标；Blockly 原界面保持清晰。
- Copy/content: 仅保留用户要求的逻辑编辑／代码查看；图标带「保存」「版本历史」的可访问名称和提示。Lua / JavaScript 内部语言标签均可见。

### 功能与技术检查

- 顶部版本历史打开原有版本管理弹窗；Lua / JavaScript 切换正常，空工作区的 JavaScript 为空属于现有数据。
- 切回逻辑编辑后 Blockly iframe 的会话 URL 保持一致。关闭抽屉后脚本 iframe 移除，原场景 iframe 的 URL 保持一致；随后重新打开抽屉供用户查看。
- 保存使用原 persistScript。单元测试验证动作转发，以及加载、只读、保存中状态；本次未提交线上业务保存或版本恢复。
- `VerseScriptDrawer.spec.ts` 4 项、`useScriptEditorBase.spec.ts` 79 项，共 83 项通过；TypeScript、相关文件 ESLint、Stylelint、Prettier、diff 检查通过。
- 控制台检查：存在此前热更新时记录的无展开详情 `Proxy(Object)` 错误和代码高亮重复提示；本次标签、版本、关闭交互未观察到对应功能失败，不宣称全站控制台无错误。

### 剩余验证边界

- 小于 767px 视口、暗色主题与长标题仅有布局／代码审查，未本轮实测。
- 未验证线上真实保存、发布、恢复版本与失败回执；未修改持久化流程。

final result: passed

## 以下为此前验收历史（不代表当前状态）

- source visual truth path: `/Users/dirui/Desktop/截屏2026-09-12 17.01.21.png`
- Source image: 1220 × 1596 px，浏览器截图含顶部 chrome，原 CSS 尺寸与设备密度未知。
- Reference behavior: 右侧模态抽屉，遮罩下保留原场景，上方标题与关闭按钮。
- Implementation: `http://127.0.0.1:3001/verse/scene?id=2329&lang=zh-CN&theme=modern-blue`
- implementation screenshot path: unavailable — 内置浏览器的线上 iframe 停在 about:blank；Chrome 最小嵌入测试成功，等待 Chrome 本地登录。
- Browser viewport used: 713 × 803 CSS px，尚未做与参考图密度归一化后的比较。
- State: 本地登录框；线上参考场景已只读查看并截屏，但线上尚无本次代码。

## Findings

视觉和真实编辑交互验收阻塞：缺少本地登录状态，无法截取改造后的实际抽屉。没有伪造并排比较，也未将类型检查或测试通过视为视觉验收通过。

- Fonts/typography: 使用现有主题字体；未完成截图验收。
- Spacing/layout rhythm: 右侧大抽屉、固定标题、小屏全宽；未完成实际窄屏与溢出验收。
- Colors/tokens: 复用现有主题变量；未完成明暗主题截图验收。
- Image quality: 本次不引入位图或替换图标资产；需检查实际 Blockly 呈现。
- Copy/content: 新增中英泰版本历史与运行预览文案；需检查实际加载内容。

## Evidence and checks

- 已查看线上原始场景界面及本地登录界面，本地公开页未观察到 console error。
- full-view comparison evidence: blocked，尚无经过登录的本地抽屉截图。
- focused region comparison evidence: blocked，同上。
- Comparison history: 尚未进行第一次有效的源图/实现比较。
- 自动测试覆盖抽屉生命周期、关闭决策、嵌入式路由守卫以及保存失败处理；不代表真实服务器保存/发布验收。

## Remaining checklist

1. 本地登录并打开一个可编辑场景。
2. 验证场景未保存状态、相机和 URL 在抽屉开关前后保持。
3. 验证 Blockly、代码查看、版本、保存/失败、运行预览。
4. 截取桌面与窄屏抽屉；与参考图一起比较标题、遮罩、边距、圆角和内容溢出。

historical result: blocked

## Plugin connection verification

Online proxy business endpoint: HTTP 200. Development runtime plugin URLs now defer to the selected Vite mode. The actual scene iframe src is https://editor.plugins.xrugc.com/three.js/editor/verse-editor.html. A minimal static iframe stayed about:blank in Codex in-app browser but displayed the complete editor toolbar in Chrome. The temporary fixture has been removed. Chrome authentication is pending before the full drawer visual comparison.

## 2026-09-12 upstream restoration

- Updated `web/develop` from `502be901` to `d23e8932`, matching the observed `origin/develop`. Restored the pre-existing local changes from retained stashes; 25 files outside the upstream overlap and intentional environment alignment match the independent backup byte-for-byte.
- Toolbar, mode tag, Unity dialog, bridge, runner source and artifact tooling match upstream without local modifications. The grouped Run / Version buttons are visible in the local scene screenshot at 1280 × 720. No new toolbar or Unity implementation was introduced.
- Ran the existing `unity:acquire` and `unity:verify`; verified release `c2816fc3523ab85d07097cac`. Removed the obsolete local Unity plugin proxy configuration in favour of the upstream same-origin runtime.
- Existing `/tests/manual/unity-runtime.html` was exercised in the in-app browser. It reached `stage: running`, `failure: null`, with `unity-scene-started-callback`; the Unity viewport rendered. Closing the existing dialog reached `stage: closed`, `cleanup: disposed`, with no remaining frame.
- Type checking and production build passed. The 58 existing Unity artifact/protocol tests and 175 targeted Unity/header/editor tests passed before the final save-feedback commit. Tests for that final commit produced 150 passes and 19 failures: the preserved PrefabDialog import reaches TagsSelect → tags API → request, while the existing scene test mocks i18n without a global locale. No code or test changes were made for these failures, per user instruction.
- Real scene 2307 still has a blank online editor iframe in the in-app browser. The standalone runtime result does not establish successful loading or behavior of that business scene. Full drawer visual and save/publish acceptance remain blocked.

## 2026-09-12 script toolbar button acceptance

- The user subsequently confirmed that the scene editor opened; the in-app browser now displays the editor for scene 2307. No code change was made to resolve the earlier blank frame, so no specific cause is asserted.
- Added the explicitly requested third toolbar action using the existing grouped button styles and existing `openScriptDrawer` callback. At the observed 847 × 803 viewport, the group shows run, history and code icons; the code action has the accessible name and tooltip “脚本编辑”.
- Clicking the new button opened “脚本编辑 · 鲸须” in the right drawer with the online Blockly UI. Code view displayed the generated Lua/JavaScript sections; version history opened the existing version dialog.
- On closing the drawer and completing its animation, the script iframe count was zero and the original scene iframe count was one. The URL remained `/verse/scene?id=2307&lang=zh-CN&theme=modern-blue`, the scene iframe src stayed unchanged, and its original entity remained listed. The scene WebMCP tools returned after closing.
- Type checking, ESLint, diff validation and 16 existing header tests passed. This acceptance did not save, restore or publish business data. Unsaved-edit camera preservation, pixel-normalized reference comparison, and real save/publish behavior have not been verified.

## 2026-09-12 WebMCP workspace refactor verification

- Added three stable scene workspace tools for context, opening the script drawer and closing it. Scene/script editing tools switch with the drawer lifecycle; the workflow guides now require rediscovery even when the URL stays unchanged.
- Related automated checks passed: 35 test files / 302 tests, TypeScript checking and production build. Coverage includes cancelled and concurrent closes, unmount/navigation invalidation, KeepAlive sessions, owner ID changes, and workspace tool registration across editor switches.
- In the local scene 2307 browser tab, all three new tools were discovered. Context accurately reported `scene.ready: false` and `script.open: false`; opening rejected with “场景编辑器尚未加载完成”. Closing an already closed drawer returned `closed` without changing business data.
- This round's full live scene → script drawer → scene tool flow remains unverified: the online scene iframe is again blank and not ready in the in-app browser. The earlier successful visual acceptance above is historical evidence, not a new end-to-end result for this refactor. No business save, restore or publish was performed.
