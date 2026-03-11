# 脚本编辑器模态窗口实现说明

## 状态

✅ 已实现但未启用

模态窗口功能已完全实现，但当前系统仍使用原有的路由跳转方式打开脚本编辑器。

## 已实现的组件

1. **ScriptEditorModal.vue** - Verse 脚本编辑器模态窗口
2. **MetaScriptEditorModal.vue** - Meta 脚本编辑器模态窗口
3. **ScriptEditorModalProvider.vue** - 全局模态窗口提供者
4. **useScriptEditorModal.ts** - Composable API

## 当前行为

- 在场景编辑器中点击"编辑脚本"按钮会通过 `router.push()` 跳转到脚本编辑器页面
- URL 会改变，浏览器历史会记录
- 这是原有的实现方式

## 如何启用模态窗口

如果将来需要启用模态窗口功能，需要进行以下修改：

### 1. 在 App.vue 中添加全局提供者

```vue
<template>
  <router-view v-slot="{ Component, route }">
    <transition name="page" mode="out-in" :key="route.fullPath">
      <component :is="Component"></component>
    </transition>
  </router-view>

  <!-- 添加这一行 -->
  <ScriptEditorModalProvider />
</template>

<script setup>
// ... 其他导入
import ScriptEditorModalProvider from "@/components/ScriptEditorModalProvider.vue";
</script>
```

### 2. 修改 verse/scene.vue

```typescript
// 添加导入
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

// 在组件中使用
const { openScriptEditor } = useScriptEditorModal();

// 修改 goto 处理
case "goto":
  if (isRecord(data) && data.target === "blockly.js") {
    const scriptRoute = router
      .getRoutes()
      .find((route) => route.path === "/verse/script");

    if (scriptRoute && scriptRoute.meta.title) {
      const metaTitle = translateRouteTitle(scriptRoute.meta.title);

      // 使用模态窗口替代路由跳转
      openScriptEditor({
        type: "verse",
        verseId: id.value,
        title: metaTitle + title.value,
      });
    }
  }
  break;
```

### 3. 修改 meta/scene.vue

```typescript
// 添加导入
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

// 在组件中使用
const { openScriptEditor } = useScriptEditorModal();

// 修改 goto 处理
case "goto":
  if (data.target === "blockly.js") {
    const scriptRoute = router
      .getRoutes()
      .find((route) => route.path === "/meta/script");

    if (scriptRoute && scriptRoute.meta.title) {
      const metaTitle = translateRouteTitle(scriptRoute.meta.title);

      // 使用模态窗口替代路由跳转
      openScriptEditor({
        type: "meta",
        metaId: id.value,
        title: metaTitle + title.value,
      });
    }
  }
  break;
```

## 模态窗口 vs 路由跳转对比

| 特性 | 路由跳转（当前） | 模态窗口 |
|------|----------------|---------|
| URL 变化 | ✅ 会改变 | ❌ 不会改变 |
| 浏览器历史 | ✅ 会记录 | ❌ 不会记录 |
| 页面切换 | ✅ 完整切换 | ❌ 叠加显示 |
| 上下文保持 | ❌ 会丢失 | ✅ 保持原页面状态 |
| 返回按钮 | ✅ 可用 | ❌ 需要关闭模态窗口 |
| 多标签页支持 | ✅ 支持 | ⚠️ 受限 |

## 使用建议

- **保持路由跳转**：如果用户习惯使用浏览器的前进/后退按钮，或需要在多个标签页中打开不同的脚本编辑器
- **使用模态窗口**：如果希望提供更流畅的编辑体验，保持场景编辑器的状态，快速切换编辑和预览

## 技术细节

### 组件结构

```
web/src/
├── components/
│   ├── ScriptEditorModal.vue          # Verse 模态窗口
│   ├── MetaScriptEditorModal.vue      # Meta 模态窗口
│   └── ScriptEditorModalProvider.vue  # 全局提供者
├── composables/
│   └── useScriptEditorModal.ts        # Composable API
└── views/
    ├── verse/
    │   ├── scene.vue                   # 场景编辑器（调用方）
    │   └── script.vue                  # 脚本编辑器页面（路由模式）
    └── meta/
        ├── scene.vue                   # 场景编辑器（调用方）
        └── script.vue                  # 脚本编辑器页面（路由模式）
```

### API 接口

```typescript
interface ScriptEditorModalOptions {
  type: "verse" | "meta";  // 编辑器类型
  verseId?: number;        // verse 类型时必填
  metaId?: number;         // meta 类型时必填
  title?: string;          // 可选：模态窗口标题
  onSaved?: () => void;    // 可选：保存成功后的回调
}

// 使用方法
const { openScriptEditor } = useScriptEditorModal();

openScriptEditor({
  type: "verse",
  verseId: 627,
  title: "脚本编辑器",
  onSaved: () => {
    console.log("保存成功");
  },
});
```

## 相关文档

- [script-editor-modal-usage.md](./script-editor-modal-usage.md) - 详细使用指南
- [plugin-development-guide.md](./plugin-development-guide.md) - 插件开发指南

## 维护说明

模态窗口组件已经完整实现并经过测试，可以随时启用。如果决定启用，只需要按照上述步骤修改调用方代码即可。

原有的路由页面（`/verse/script` 和 `/meta/script`）会继续保留，以支持：
- 直接通过 URL 访问
- 浏览器书签
- 外部链接
- 向后兼容
