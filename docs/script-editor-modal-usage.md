# 脚本编辑器模态窗口使用指南

## 概述

脚本编辑器现在支持两种使用方式：
1. **路由页面模式**：通过 `/verse/script?id=627` 访问（原有方式，保持向后兼容）
2. **模态窗口模式**：在任何页面通过 composable 调用，以全屏模态窗口形式打开

## 模态窗口模式使用方法

### 基本用法

在任何 Vue 组件中使用：

```vue
<template>
  <div>
    <el-button @click="openVerseEditor">打开 Verse 脚本编辑器</el-button>
    <el-button @click="openMetaEditor">打开 Meta 脚本编辑器</el-button>
  </div>
</template>

<script setup lang="ts">
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

const { openScriptEditor } = useScriptEditorModal();

const openVerseEditor = () => {
  openScriptEditor({
    type: "verse",
    verseId: 627,
    title: "项目脚本编辑器【fortest】",
    onSaved: () => {
      console.log("脚本已保存");
    },
  });
};

const openMetaEditor = () => {
  openScriptEditor({
    type: "meta",
    metaId: 123,
    title: "实体脚本编辑器",
    onSaved: () => {
      console.log("脚本已保存");
    },
  });
};
</script>
```

### API 说明

#### `useScriptEditorModal()`

返回以下方法和状态：

- `openScriptEditor(options)` - 打开脚本编辑器模态窗口
- `closeScriptEditor()` - 关闭模态窗口
- `handleSaved()` - 触发保存回调（由模态窗口组件内部调用）
- `isModalOpen` - 模态窗口是否打开（响应式）
- `currentVerseId` - 当前编辑的 verse ID（响应式）
- `currentMetaId` - 当前编辑的 meta ID（响应式）
- `currentType` - 当前编辑器类型，`"verse"` 或 `"meta"`（响应式）
- `currentTitle` - 当前标题（响应式）

#### `openScriptEditor` 参数

```typescript
interface ScriptEditorModalOptions {
  type: "verse" | "meta";  // 必填：编辑器类型
  verseId?: number;        // verse 类型时必填
  metaId?: number;         // meta 类型时必填
  title?: string;          // 可选：模态窗口标题
  onSaved?: () => void;    // 可选：保存成功后的回调函数
}
```

### 使用场景示例

#### 1. 在场景编辑器中添加快捷按钮

```vue
<template>
  <div class="scene-editor">
    <el-button
      type="primary"
      @click="openScriptEditor({ type: 'verse', verseId: currentVerseId })"
    >
      编辑脚本
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

const currentVerseId = ref(627);
const { openScriptEditor } = useScriptEditorModal();
</script>
```

#### 2. 在项目列表中直接打开

```vue
<template>
  <el-table :data="projects">
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button
          size="small"
          @click="editScript(row.id)"
        >
          编辑脚本
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

const { openScriptEditor } = useScriptEditorModal();

const editScript = (verseId: number) => {
  openScriptEditor({
    type: "verse",
    verseId,
    onSaved: () => {
      ElMessage.success("脚本保存成功");
      // 刷新列表
      loadProjects();
    },
  });
};
</script>
```

#### 3. 带确认的保存回调

```vue
<script setup lang="ts">
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";

const { openScriptEditor } = useScriptEditorModal();

const openWithCallback = () => {
  openScriptEditor({
    type: "verse",
    verseId: 627,
    title: "高级脚本编辑",
    onSaved: async () => {
      // 保存后自动发布
      await publishVerse(627);
      ElMessage.success("脚本已保存并发布");
    },
  });
};
</script>
```

## 功能特性

### 模态窗口特性

- ✅ 全屏显示，最大化编辑空间
- ✅ 支持未保存提示，防止意外关闭
- ✅ 支持 ESC 键关闭（有未保存提示）
- ✅ 支持全屏模式切换
- ✅ 完整的 Blockly 编辑器功能
- ✅ Lua 和 JavaScript 代码预览
- ✅ 测试运行功能
- ✅ 保存并发布流程

### 与路由模式的区别

| 特性 | 路由模式 | 模态窗口模式 |
|------|---------|-------------|
| URL 变化 | ✅ 会改变 | ❌ 不会改变 |
| 浏览器历史 | ✅ 会记录 | ❌ 不会记录 |
| 页面切换 | ✅ 完整切换 | ❌ 叠加显示 |
| 上下文保持 | ❌ 会丢失 | ✅ 保持原页面状态 |
| 适用场景 | 独立编辑 | 快速编辑、辅助功能 |

## 技术实现

### 组件结构

```
web/src/
├── components/
│   ├── ScriptEditorModal.vue          # 模态窗口组件
│   └── ScriptEditorModalProvider.vue  # 全局提供者
├── composables/
│   └── useScriptEditorModal.ts        # Composable API
└── views/verse/
    └── script.vue                      # 原路由页面（保持兼容）
```

### 状态管理

使用 Vue 3 Composition API 的响应式系统，通过 composable 实现全局状态共享：

```typescript
// 全局单例状态
const isModalOpen = ref(false);
const currentVerseId = ref<number>(0);
const currentMetaId = ref<number>(0);
const currentType = ref<"verse" | "meta">("verse");
const currentTitle = ref<string>("");
const savedCallback = ref<(() => void) | undefined>();
```

### 生命周期

1. 调用 `openScriptEditor()` → 设置参数 → 打开模态窗口
2. 模态窗口 watch `modelValue` → 加载 verse 数据
3. 用户编辑并保存 → 触发 `@saved` 事件 → 执行回调
4. 关闭模态窗口 → 检查未保存变更 → 确认后关闭

## 注意事项

1. **全局单例**：同一时间只能打开一个脚本编辑器模态窗口
2. **数据加载**：每次打开都会重新加载 verse 数据
3. **未保存提示**：关闭时会检查是否有未保存的变更
4. **回调执行**：`onSaved` 回调在保存成功后立即执行，在发布确认之前
5. **性能考虑**：模态窗口包含完整的编辑器，建议在需要时才打开

## 迁移指南

### 从路由模式迁移到模态窗口模式

**之前（路由模式）：**
```vue
<el-button @click="$router.push(`/verse/script?id=${verseId}`)">
  编辑脚本
</el-button>
```

**之后（模态窗口模式）：**
```vue
<script setup>
import { useScriptEditorModal } from "@/composables/useScriptEditorModal";
const { openScriptEditor } = useScriptEditorModal();
</script>

<template>
  <el-button @click="openScriptEditor({ verseId })">
    编辑脚本
  </el-button>
</template>
```

## 常见问题

### Q: 可以同时打开多个脚本编辑器吗？
A: 不可以。当前实现是全局单例，同一时间只能打开一个。如果需要同时编辑多个脚本，请使用路由模式在新标签页打开。

### Q: 模态窗口会影响原页面的状态吗？
A: 不会。模态窗口是叠加显示，原页面的状态和数据都会保持。

### Q: 如何在保存后刷新原页面数据？
A: 使用 `onSaved` 回调函数：
```typescript
openScriptEditor({
  verseId: 627,
  onSaved: () => {
    // 刷新数据
    loadData();
  },
});
```

### Q: 可以自定义模态窗口的大小吗？
A: 当前模态窗口固定为全屏显示，以提供最佳的编辑体验。如需调整，可以修改 `ScriptEditorModal.vue` 组件。

## 示例代码

完整的使用示例请参考：
- `web/src/components/ScriptEditorModal.vue` - 模态窗口组件实现
- `web/src/composables/useScriptEditorModal.ts` - Composable API 实现
- `web/src/views/verse/script.vue` - 原路由页面实现（可作为参考）
