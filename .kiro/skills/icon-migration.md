# 图标迁移指南: Material Symbols → FontAwesome

## 背景
项目侧边栏使用 Google Material Symbols Outlined 字体图标（CDN 加载），导致字体下载前显示图标文字名称（FOUT 问题）。
决定迁移到已本地安装的 FontAwesome（SVG 渲染，零延迟）。

## 关键信息
- FontAwesome 已安装: `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/vue-fontawesome`
- 全局组件 `<font-awesome-icon>` 已在 `main.ts` 注册
- 图标需要在 `main.ts` 的 `library.add()` 中按需注册
- 完整映射表见 `findings.md` 的"Material Symbols → FontAwesome Free 映射表"

## 替换模式
```html
<!-- 之前: Material Symbols (字体图标) -->
<span class="material-symbols-outlined">home</span>

<!-- 之后: FontAwesome (SVG 图标) -->
<font-awesome-icon :icon="['fas', 'home']" />
```

## CSS 注意事项
- Material Symbols 用 `.material-symbols-outlined` 选择器
- FontAwesome SVG 用 `.svg-inline--fa` 选择器
- 主题文件 `theme-styles.scss` 中有大量 `.material-symbols-outlined` 样式需要替换

## ⚠️ 组件 Prop 传图标的正确方式

Vue 组件 prop 传 FontAwesome 图标时，**必须用绑定数组**，不能用静态字符串：

```html
<!-- ❌ 错误：静态字符串会被当作 Material Symbols 名称，运行时报错 -->
<StandardCard type-icon="videocam" placeholder-icon="extension" />

<!-- ✅ 正确：绑定数组 -->
<StandardCard :type-icon="['fas', 'video']" :placeholder-icon="['fas', 'puzzle-piece']" />
```

## 常见 Material Symbols → FontAwesome 映射

| Material Symbols | FontAwesome | FA 变量名 |
|-----------------|-------------|-----------|
| `videocam` | `video` | `faVideo` |
| `extension` | `puzzle-piece` | `faPuzzlePiece` |
| `token` | `circle-dot` | `faCircleDot` |
| `edit` | `pen-to-square` | `faPenToSquare` |
| `home` | `home` | `faHome` |
| `layers` | `layer-group` | `faLayerGroup` |
| `visibility` | `eye` | `faEye` |
| `landscape` | `image` | `faImage` |
| `category` | `folder-open` | `faFolderOpen` |
| `school` | `building` | `faBuilding` |
| `corporate_fare` | `building` | `faBuilding` |
| `person` / `person_4` | `user` | `faUser` |
| `download` | `download` | `faDownload` |

所有图标需在 `src/main.ts` 的 `library.add()` 中注册后才能使用。

## 迁移计划
详见 `task_plan.md`
