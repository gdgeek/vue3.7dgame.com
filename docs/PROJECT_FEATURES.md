# MRPP 混合现实编程平台 — 项目特点与优势

> 版本：v2.11.5 | 技术栈：Vue 3.5 + Vite 5 + TypeScript 5 + Element Plus + Pinia + Three.js

---

## 一、项目定位

MRPP（Mixed Reality Programming Platform）是一个面向 **3D 场景创作与编程教育** 的综合性 Web 平台，融合了 3D 可视化编辑、可视化编程（Blockly）、多域名白标化部署和校园管理等能力，适用于创客教育、XR 内容创作和数字资产管理场景。

---

## 二、核心特点

### 1. Three.js 3D 场景编辑器

- 完整的 3D 渲染管线：`Scene` → `PerspectiveCamera` → `WebGLRenderer` + `OrbitControls`
- **多格式资源支持**：
  - GLTF/GLB 模型（`GLTFLoader` + `DRACOLoader` 压缩 + `KTX2Loader` 纹理压缩）
  - VOX 体素模型（`VOXLoader` + `VOXMesh`）
  - 视频纹理（`THREE.VideoTexture` 映射到 3D 平面）
  - 图片、音频、粒子等多媒体资源
- **3D 交互**：射线检测（`Raycaster`）、动画系统（`AnimationMixer`）
- **场景导入/导出**：ZIP 打包，支持跨环境迁移

### 2. Blockly 可视化编程集成

- 通过 iframe 嵌入 Blockly 编辑器，支持积木式编程
- 编程数据保存与恢复，支持多语言切换
- 适合编程教育和低代码场景搭建

### 3. 多域名白标化部署

支持 6 个品牌域名一套代码部署：`mrpp_com`、`4mr_cn`、`01xr_com`、`7dgame_com`、`1ucb_com`、`voxelparty_com`

| 能力 | 说明 |
|------|------|
| 运行时动态配置 | 通过 API (`/api/query/default`) 查询域名配置，非编译时写死 |
| Cookie 缓存 | 域名配置 7 天本地缓存，减少网络请求 |
| 域名级语言锁定 | `isLanguageLocked` 强制使用指定语言，隐藏语言选择 |
| 域名级样式锁定 | `isStyleLocked` 锁定主题风格 |
| 动态 SEO | 自动更新 `<title>`、`<meta description>`、`<meta keywords>`、`<meta author>` |
| 自定义 Favicon | 域名配置指定图标字段 |
| WordPress 博客集成 | 域名配置中包含 `blog` 字段 |
| 独立构建脚本 | `pnpm run build:7dgame_com` 对应 `.env.7dgame_com` |

### 4. API 双层故障转移 + Token 预刷新

**高可用 API 架构：**

```
请求 → 主 API 失败 → 自动切换备用 API → 30 秒健康检查 → 主 API 恢复后自动切回
```

| 特性 | 实现 |
|------|------|
| 主/备 API 自动切换 | 响应拦截器检测网络错误，自动重试备用地址 |
| 健康检查 | 30 秒间隔 ping `/health`，3 秒超时 |
| Token 预刷新 | 提前 5 分钟自动刷新 token |
| 并发刷新去重 | 多个请求共享同一刷新 Promise |
| 白名单机制 | 排除 auth 相关端点，避免循环 |
| 401 统一处理 | 清除 token → 跳转登出，防止多次触发 |

### 5. 细粒度 CASL 权限系统

基于 `@casl/ability` + `@casl/vue` 实现：

**4 级角色体系：**

| 角色 | 权限范围 |
|------|---------|
| `user` | 基础路由 + 资源管理 + 项目/Meta |
| `manager` | user + 管理器能力 |
| `admin` | manager + 用户管理 + 管理后台 |
| `root` | 全部权限 + AI 功能 + 校园管理 + Phototype |

**7 种能力维度：**
- `AbilityRouter`（路由访问）
- `AbilityEdit`（编辑权限）
- `AbilityEditable`（可编辑性）
- `AbilityRole`（角色能力）
- `AbilityViewable`（可查看性）
- `AbilityWorks`（作品所有权）
- `AbilityMessage`（消息能力）

路由菜单根据权限动态显示/隐藏，按钮级别支持权限指令控制。

### 6. 五语种国际化

| 语言 | 代码 |
|------|------|
| 简体中文 | `zh-CN` |
| 繁体中文 | `zh-TW` |
| 英文 | `en-US` |
| 日文 | `ja-JP` |
| 泰文 | `th-TH` |

**技术亮点：**
- 仅 `zh-CN` 静态加载，其余语言 `import.meta.glob` **异步懒加载**
- 每个语言包按业务模块拆分（common/route/login/homepage/resource/meta/verse/manager/campus）
- 语言切换自动刷新域名 SEO 元数据
- 支持域名级语言锁定

### 7. 校园管理模块

覆盖完整教育管理：
- 学校管理
- 教师管理
- 学生管理
- 班级管理
- 小组管理

适合 K12 创客教育、编程教学等教育场景。

### 8. 丰富的资源管理

| 资源类型 | 说明 |
|---------|------|
| Voxel 体素 | VOX 格式 3D 体素编辑与展示 |
| Polygen 多边形 | GLTF/GLB 3D 模型管理 |
| Picture 图片 | 图片资源上传与管理 |
| Video 视频 | 视频资源管理 |
| Audio 音频 | 音频资源管理 |
| Particle 粒子 | 粒子特效管理 |

### 9. 完善的主题系统

- 深色/浅色模式切换
- 自定义主色（`useTheme` composable，380+ 行完整实现）
- 主题持久化到 localStorage
- 域名级风格锁定

---

## 三、工程化优势

### 1. 构建优化

| 策略 | 说明 |
|------|------|
| 手动代码分割 | `vue-core`、`element-plus`、`three`、`codemirror`、`fontawesome` 独立 chunk |
| Gzip 压缩 | `vite-plugin-compression`，阈值 10KB |
| 依赖预加载 | `optimizeDeps.include` 加速 Vue/Router/Pinia/Axios 等核心库 |
| 生产移除调试 | esbuild `drop: ["console", "debugger"]` |
| 构建可视化 | `rollup-plugin-visualizer` 生成依赖分析报告 |

### 2. 自动导入

- Vue API、VueUse、Pinia、Vue Router、Vue I18n **自动导入**
- Element Plus 组件和图标**按需自动注册**
- `src/components/` 和 `src/**/components/` 自定义组件**自动注册**
- SVG 图标系统（`vite-plugin-svg-icons`）

### 3. 代码质量保障

| 工具 | 用途 |
|------|------|
| ESLint | TypeScript + Vue 代码规范检查 |
| Prettier | 代码格式化 |
| Stylelint | CSS/SCSS/Vue 样式规范 |
| Husky | Git 钩子（预提交自动检查） |
| lint-staged | 增量检查暂存文件 |
| Commitizen + cz-git | 交互式规范化提交信息 |
| Conventional Commits | 提交消息规范（feat/fix/docs/refactor...） |

### 4. 完整测试体系

| 测试类型 | 工具 | 说明 |
|---------|------|------|
| 单元测试 | Vitest + jsdom | 全局变量、自动导入、V8 覆盖率 |
| E2E 测试 | Playwright | Chromium、CI 自动重试、自动启动开发服务器 |
| 组件文档 | Storybook 10 | Vue 3 + Vite、无障碍插件、Vitest 集成 |

### 5. Docker 全链路部署

**多阶段构建：**
1. `node:20-alpine` — 安装依赖 + 构建
2. `nginx:alpine` — 静态托管

**运行时环境注入：**
- `docker-entrypoint.sh` 启动时通过 `sed` 替换占位符 URL
- 向 `index.html` 注入 `window.__API_URL__`、`window.__BACKUP_API_URL__` 等全局变量
- 支持同一镜像部署到不同环境，无需重新构建

**Docker Compose：**
- `docker-compose.dev.yml` — 开发环境（挂载源码卷）
- `docker-compose.test.yml` — 测试/生产环境

---

## 四、技术栈总览

| 分类 | 技术 |
|------|------|
| 框架 | Vue 3.5 + TypeScript 5 |
| 构建 | Vite 5 |
| UI 库 | Element Plus 2.9 |
| 状态 | Pinia + persistedstate |
| 路由 | Vue Router 4 |
| 3D | Three.js 0.167 |
| 权限 | CASL 6 |
| 国际化 | Vue I18n 9 |
| HTTP | Axios（主/备故障转移） |
| CSS | SCSS + UnoCSS |
| 编辑器 | CodeMirror 6 |
| 图标 | Element Plus Icons + FontAwesome + SVG |
| 可视化编程 | Blockly（iframe 集成） |
| 对象存储 | 腾讯云 COS SDK |
| 加密 | CryptoJS + secure-ls |
| 日期 | Day.js |
| 二维码 | qrcode + qrcode.vue |
| 动画 | AOS |
| 测试 | Vitest + Playwright + Storybook |
| 部署 | Docker + Nginx |
| 代码规范 | ESLint + Prettier + Stylelint + Husky |

---

## 五、项目优势总结

1. **全栈混合现实平台** — 集 3D 编辑、可视化编程、资源管理于一体，面向 XR 创作与教育场景
2. **一套代码多品牌** — 运行时动态配置 6+ 域名品牌，SEO/语言/主题/图标均可独立定制
3. **高可用 API** — 双层故障转移 + 自动恢复 + Token 预刷新，保障业务连续性
4. **企业级权限** — CASL 细粒度权限控制，4 级角色 × 7 种能力维度
5. **全球化就绪** — 5 语种异步加载国际化，域名级语言锁定
6. **极致工程化** — 自动导入/代码分割/Gzip 压缩/构建可视化，开发体验与生产性能兼顾
7. **完整测试覆盖** — 单元测试 + E2E + Storybook 组件文档三位一体
8. **一键容器化部署** — Docker 多阶段构建 + 运行时环境注入，同镜像多环境复用
9. **教育场景深度适配** — 校园管理 + Blockly 编程教学 + 资源体系，开箱即用
10. **主题与体验** — 深色/浅色模式 + 自定义主色 + 域名级风格锁定，灵活定制
