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

## 迁移计划
详见 `task_plan.md`
