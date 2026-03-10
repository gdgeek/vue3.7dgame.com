---
inclusion: fileMatch
fileMatchPattern: '**/*.vue,**/*.ts'
---

# structuredClone 安全使用规则

`structuredClone()` 无法克隆以下对象，会抛出 `DataCloneError`：
- Vue reactive proxy（ref, reactive, computed）
- 函数 / 闭包
- DOM 节点
- Symbol
- WeakMap / WeakSet

## 规则

在项目中使用 `structuredClone` 时，必须加 try/catch fallback：

```typescript
let cloned: unknown;
try {
  cloned = structuredClone(data);
} catch {
  cloned = JSON.parse(JSON.stringify(data));
}
```

或使用 `src/composables/useScriptEditorBase.ts` 中的 `safeClone` 工具函数。

## 审计记录（2026-03-10）

| 文件 | 状态 |
|------|------|
| `src/views/meta/scene.vue` | ✅ 已修复，有 fallback |
| `src/views/verse/scene.vue` | ✅ 已修复，有 fallback |
| `src/composables/useScriptEditorBase.ts` | ✅ safeClone 已有 fallback |
| `src/components/JsonSchemaForm/ArrayField.vue` | ✅ 已修复，有 fallback |
| `src/components/JsonSchemaForm/index.vue` | ✅ 已修复，有 fallback |
| `src/router/index.ts` | ✅ 已注释说明不使用 structuredClone |
