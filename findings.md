# 退出登录流程分析

## 所有退出登录相关路径

### 1. 路由定义（重复/冲突）

| 位置 | 路径 | 行为 |
|------|------|------|
| `src/router/modules/public.ts` | `/site/logout` | → `@/views/site/logout/index.vue` |
| `src/router/index.ts` (Layout children) | `/site/logout` | `redirect: "/logout"`, component: null |

⚠️ **问题1：`/site/logout` 路由定义了两次，且行为不同。**

### 2. 触发退出的入口

| 触发方式 | 文件 | 说明 |
|----------|------|------|
| 401 响应 | `src/utils/request.ts` | `handleUnauthorized()` → `userStore.logout()` → `router.push("/site/logout")` |
| Token 刷新失败 | `src/utils/request.ts` | 请求拦截器中 refreshToken 失败 → `handleUnauthorized()` |
| permission 守卫 | `src/plugins/permission.ts` | catch 中 `Token.removeToken()` → `redirectToLogin()` |

### 3. 退出登录的处理逻辑（多处重复）

| 文件 | 逻辑 |
|------|------|
| `src/views/site/logout/index.vue` | `onMounted` → `userStore.logout()` → 延迟跳转 homepage |
| `src/views/login/index.vue` | watch route → `/site/logout` → `userStore.logout()` + `delAllViews()` + 跳转 |
| `src/views/site/index.vue` | watch route → `/site/logout` → `userStore.logout()` + `delAllViews()` + 跳转 |
| `src/views/register/index.vue` | watch route → `/site/logout` → `userStore.logout()` + `delAllViews()` + 跳转 |

### 4. `userStore.logout()` 实现问题

```ts
// 用空字符串而非删除
await localStorage.setItem(TOKEN_KEY, "");
```

### 5. `Token.removeToken()` 实现

```ts
// 真正删除
localStorage.removeItem(TOKEN_KEY);
```

---

## 发现的问题汇总

### 问题1：`/site/logout` 路由重复定义，行为冲突
- `public.ts` → 渲染 `site/logout/index.vue`
- `router/index.ts` Layout children → redirect 到 `/logout`（该路径无对应路由，会 404）

### 问题2：`userStore.logout()` 没有调用后端 API
- `AuthAPI.logout()` 存在（DELETE `/v1/auth/logout`），但完全没被调用
- 服务端 session/token 没有被注销

### 问题3：Token 清除方式不一致
- `userStore.logout()` → `localStorage.setItem(TOKEN_KEY, "")` 设为空字符串
- `Token.removeToken()` → `localStorage.removeItem(TOKEN_KEY)` 真正删除
- 空字符串会导致 `JSON.parse("")` 抛异常（虽被 catch），不干净

### 问题4：退出逻辑在多个视图中重复
- 4 个文件都有各自的 logout 处理，造成维护困难和潜在的死代码

### 问题5：`site/logout/index.vue` 中有调试代码残留
- `console.error(...)` 和 `alert(123)`

### 问题6：permission.ts 中的退出处理不完整
- 只调用 `Token.removeToken()`，没有清空 userInfo
- `userStore.resetToken()` 被注释掉了


---

# 侧边栏图标加载问题分析

## 根本原因
侧边栏使用 Google Material Symbols Outlined 字体图标，通过 CDN (`fonts.googleapis.com`) 加载。
字体下载完成前，浏览器显示图标的文字名称（如 "home"、"category"），导致用户看到长文字。

## 当前状态
- `src/assets/fonts/material-symbols-outlined.woff2` 已下载到本地（3MB）
- `src/assets/fonts/material-symbols.css` 已创建（本地 @font-face）
- FontAwesome (`@fortawesome`) 已通过 npm 本地安装，不依赖 CDN

## Material Symbols → FontAwesome Free 映射表

| Material Symbols | FontAwesome Free | FA 导入名 | 用途 |
|-----------------|-----------------|-----------|------|
| home | fas home | faHome | 主页 |
| category | fas th-large | faThLarge | 素材库 |
| token | fas puzzle-piece | faPuzzlePiece | 实体 |
| smart_toy | fas robot | faRobot | AI 创作 |
| layers | fas layer-group | faLayerGroup | 场景 |
| corporate_fare | fas building | faBuilding | 校园管理 |
| display_settings | fas sliders | faSliders | 管理中心 |
| logout | fas right-from-bracket | faRightFromBracket | 退出登录 |
| help | fas circle-question | faCircleQuestion | 帮助中心 |
| settings | fas gear | faGear | 个人设置 |
| search | fas search | faSearch | 搜索 |
| check | fas check | faCheck | 选中 |
| close | fas xmark | faXmark | 关闭 |
| delete | fas trash-can | faTrashCan | 删除 |
| edit | fas pen-to-square | faPenToSquare | 编辑 |
| edit_note | fas file-lines | faFileLines | 编辑备注 |
| download | fas download | faDownload | 下载 |
| upload / cloud_upload | fas cloud-arrow-up | faCloudArrowUp | 上传 |
| image | fas image | faImage | 图片 |
| headphones | fas headphones | faHeadphones | 音频 |
| videocam | fas video | faVideo | 视频 |
| person | fas user | faUser | 用户 |
| person_4 | fas user-tie | faUserTie | 老师 |
| lock | fas lock | faLock | 私有 |
| public | fas globe | faGlobe | 公开 |
| language | fas language | faLanguage | 语言 |
| palette | fas palette | faPalette | 主题 |
| bolt | fas bolt | faBolt | 闪电 |
| campaign | fas bullhorn | faBullhorn | 公告 |
| schedule | fas clock | faClock | 时间 |
| info | fas circle-info | faCircleInfo | 信息 |
| qr_code_2 | fas qrcode | faQrcode | 二维码 |
| view_in_ar | fas cube | faCube | 3D模型 |
| deployed_code | fas cubes | faCubes | 体素 |
| blur_on | fas circle-dot | faCircleDot | 粒子 |
| landscape | fas image | faImage | 预览占位 |
| grid_view | fas grip | faGrip | 网格视图 |
| view_list | fas list | faList | 列表视图 |
| restart_alt | fas arrows-rotate | faArrowsRotate | 重置 |
| colorize | fas eye-dropper | faEyeDropper | 取色 |
| fullscreen / fullscreen_exit | fas expand/compress | faExpand/faCompress | 全屏 |

## 结论
所有 Material Symbols 图标都能在 FontAwesome Free 中找到合理替代。
可以完全迁移到 FontAwesome，去掉 Material Symbols CDN 依赖。
