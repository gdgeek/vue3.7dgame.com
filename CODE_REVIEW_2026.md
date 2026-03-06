# 项目代码审查报告 — vue3.7dgame.com

> 审查日期：2026-03-05
> 审查工具：Claude Code (claude-sonnet-4-6)
> 审查范围：`src/` 目录下全部 Vue / TypeScript 源文件

---

## 📊 数据统计

| 指标 | 数值 |
|------|------|
| 源文件总数（.vue + .ts） | **431** |
| 生产代码中 `any` 类型使用 | **1**（注释内，实际为 0） |
| `@ts-nocheck` 覆盖的生产文件 | **4** |
| 最大单文件行数 | **2086**（ScenePlayer/index.vue） |
| 最大 composable 行数 | **555**（useEmailVerification.ts） |
| v-html 使用 | **0** |
| console.log 遗留 | **0**（均通过 logger 封装） |
| TODO/FIXME 注释 | **0** |
| 硬编码中文字符串（违反 i18n） | **10+** |
| 定时器泄漏风险点 | **2** |

---

## 🔴 高优先级问题（建议尽快修复）

### 1. 权限列表硬编码绕过了服务端权限系统

**文件**：`src/store/modules/user.ts:131-154`

```typescript
const perms: string[] = [
  "sys:menu:delete",
  "sys:dept:edit",
  // ... 共 21 条权限 ...
];
// 在 getUserInfo 和 setUserInfo 中均赋值：
userInfo.value.perms = perms;
```

**问题**：每次拉取用户信息后，都将一份**本地硬编码**的 perms 覆盖掉服务端返回的权限数据。无论用户的实际角色是什么，都会被赋予这 21 条操作权限。这是权限系统的一个严重漏洞——即使服务端缩减了某用户的权限，前端也不会感知。

**建议**：删除本地 `perms` 数组，直接使用 `response.data.data.perms`（服务端返回值）。若服务端暂未返回，应统一返回空数组并记录警告。

---

### 2. `@ts-nocheck` 覆盖核心业务文件

**文件**：
- `src/composables/useScriptRuntime.ts:1`（488 行）
- `src/composables/useScriptEditorBase.ts:1`（465 行）
- `src/views/meta/script.vue:233`
- `src/views/verse/script.vue:229`

**问题**：这四个文件合计约 1500+ 行，承载了 3D 场景脚本执行的核心逻辑，却通过 `// @ts-nocheck` 完全关闭了 TypeScript 检查。编译器无法发现其中的类型错误，回归风险极高。

`useScriptRuntime.ts` 内部已经有精心设计的类型（`MeshWrapper`、`TaskObject` 等），说明类型化是可行的。加 `@ts-nocheck` 可能只是暂时规避了若干 `unknown` 相关的编译报错。

**建议**：移除 `@ts-nocheck`，逐行修复编译报错，尤其是 `task.execute` 中对 `tweenData` 的多处强转。

---

### 3. `new Function()` 动态代码执行（XSS / 代码注入风险）

**文件**：
- `src/views/meta/script.vue:526`
- `src/views/verse/script.vue:595`

```typescript
const createFunction = new Function(wrappedCode);  // 等价于 eval()
const executableFunction = createFunction();
await executableFunction(...);
```

**问题**：`new Function(string)` 与 `eval()` 危险程度相当。如果 `wrappedCode` 来自用户可控的存储（场景脚本由用户编写并存储到服务端，再由本页面拉取执行），攻击者可在脚本中注入任意 JS 代码，在其他用户浏览该场景时执行。

**建议**：
1. 确认服务端对脚本内容做了严格的存储审计和 XSS 过滤；
2. 在文件顶部添加安全注释，说明此处为"可信用户脚本执行沙箱"；
3. 如果用户是平台内部可信用户（非公开访客），当前风险可接受，但必须有文档说明；
4. 长期方向考虑使用 `iframe` + `postMessage` 沙箱隔离。

---

### 4. `window.meta` / `window.verse` 全局命名空间污染

**文件**：
- `src/components/ScenePlayer/index.vue:341-346`
- `src/views/meta/script.vue:494`
- `src/views/verse/script.vue:543-544`

```typescript
// script.vue 中注册：
window.meta = {};
// ScenePlayer 中调用：
if (window.meta && typeof window.meta[`@${eventId}`] === 'function') {
  await window.meta[`@${eventId}`]();
}
```

**问题**：事件回调直接挂载在 `window` 全局对象上，key 为用户自定义名称。若同一个浏览器 Tab 中同时渲染多个 ScenePlayer 实例（如预览模式 + 编辑模式），后一个会静默覆盖前一个的回调，产生难以追踪的 bug。`window.meta` 也是容易被三方脚本意外覆盖的通用名。

**建议**：使用 `WeakMap` 或 `provide/inject` 将事件回调与具体组件实例绑定，而非挂到全局。

---

### 5. Wechat.vue 轮询定时器无 unmount 清理

**文件**：`src/components/Account/Wechat.vue:77,164`

```typescript
let progressInterval: NodeJS.Timeout | undefined = undefined;
// 开始轮询（164行）
progressInterval = setInterval(() => { ... }, 2000);
// 清理只在回调成功/失败时（112-113行）：
clearInterval(progressInterval);
```

**问题**：`progressInterval` 只在轮询回调内部被清理，但没有 `onUnmounted` 钩子。如果用户在轮询进行中关闭对话框或跳转页面，组件被销毁但定时器依然运行，每 2 秒发一次 HTTP 请求，直到页面关闭。

**建议**：
```typescript
onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = undefined;
  }
});
```

---

## 🟡 中优先级问题（迭代中改进）

### 6. `logger.error` 被用作调试日志

**文件**：`src/composables/useScriptRuntime.ts:149, 432`

```typescript
// helper.handler() 正常执行时打印（非错误场景）：
logger.error("当前的source", source);   // line 149

// point.setVisual() 正常调用时打印：
logger.error("setVisual", object, setVisual);  // line 432
```

此外，`task.circle` 和 `task.array` 中有多处 `logger.log`（lines 243, 253, 285, 303）会在每次脚本执行时输出大量日志。

**问题**：`logger.error` 应仅用于真正的错误场景。把调试信息用 error 级别打印会掩盖真正的错误信号，且在生产环境产生大量噪音。

**建议**：将正常流程中的调试语句改为 `logger.debug`，或在审查确认没有用途后直接删除。

---

### 7. `Function` 类型不提供类型安全

**文件**：
- `src/components/ScenePlayer/index.vue:70-71`（window 声明）
- `src/components/ScenePlayer/index.vue:1704`（音频队列类型）
- `src/utils/downloadHelper.ts:24`（函数参数）
- `src/views/web/index.vue:249`（debounce 参数）

```typescript
// ScenePlayer 中：
interface Window {
  meta: { [key: string]: Function };  // ❌ 应为具体签名
}
const audioPlaybackQueue: { audio: HTMLAudioElement; resolve: Function }[] = [];
// downloadHelper 中：
t: Function,  // ❌ 应为 (key: string) => string
```

**建议**：替换为精确函数签名，例如：
```typescript
resolve: (value: void | PromiseLike<void>) => void
t: (key: string, ...args: unknown[]) => string
```

---

### 8. 硬编码中文字符串违反 i18n 规范

**文件**：
- `src/composables/useEmailVerification.ts:29` — `"请求失败"`
- `src/composables/useEmailVerification.ts:175` — `"改绑令牌已过期，请重新验证旧邮箱"`
- `src/composables/useEmailVerification.ts` 中多处 `"获取邮箱状态失败"` 等
- `src/environment.ts:46` — `subtitle: () => "支持Rokid设备"`

CLAUDE.md 明确规定：**禁止在源码中硬编码中文字符串**。上述字符串需提取到 5 个语言文件。

---

### 9. 两处 Failover 逻辑重复

**文件**：`src/utils/request.ts:23-41` 与 `src/api/domain-query.ts:30-54`

两个模块几乎完全相同地实现了：
- 主/备 API 切换
- `healthCheckTimer` 定时健康检查
- 恢复后切回主 API

任何修复（如健康检查间隔、重试策略）都需要同步修改两处，违反 DRY 原则。

**建议**：提取 `createFailoverAxios(primaryUrl, backupUrl)` 工厂函数到 `src/utils/failover.ts`，两处共用。

---

### 10. `refreshInterval` 声明但从未启动

**文件**：`src/store/modules/user.ts:102`

```typescript
const refreshInterval = ref<NodeJS.Timeout | null>(null);
// logout 中会清理它，但全文没有任何地方 set 它
```

`refreshInterval` 被 `logout()` 清理，也在 `return` 中暴露，但整个文件里从未有赋值启动的代码。这是一个僵尸引用，会误导维护者以为存在自动 token 刷新机制（实际 token 刷新在 request.ts 拦截器中按需触发）。

**建议**：删除 `refreshInterval` 的声明和 return，并在注释中说明 token 刷新策略。

---

### 11. `availableVoices.ts` 是 1279 行静态数据，命名为 store module

**文件**：`src/store/modules/availableVoices.ts`

此文件只包含一个 1000+ 项的 `VoiceType[]` 数组，既不是 Pinia store，也没有任何响应式逻辑，却放在 `store/modules/` 目录下。

**建议**：
- 短期：移动到 `src/constants/voices.ts` 或 `src/data/voices.ts`；
- 长期：考虑由 API 动态提供音色列表（尤其随 TTS 服务升级，列表会变化）。

---

### 12. `export let constantRoutes` 可变导出

**文件**：`src/router/index.ts:82`

```typescript
export let constantRoutes: RouteRecordRaw[] = routes;
// UpdateRoutes 中直接重新赋值：
constantRoutes = structuredClone(routes);
```

可变的模块导出（`export let`）是反模式：导入方持有的是"活绑定"，在 `UpdateRoutes` 被调用后其值会悄然变化，难以追踪。

**建议**：改为导出一个 getter 函数或 ref，或改用 `export const` + 内部可变变量的访问器模式。

---

### 13. `useEmailVerification` 的 cleanup 依赖调用方手动处理

**文件**：`src/composables/useEmailVerification.ts:514-519`

```typescript
const cleanup = () => {
  startCountdown(sendCooldown, 0, "send");
  // ...清理所有定时器
};
// 调用方必须在 onUnmounted 中主动调用 cleanup()
```

Composable 内部有 4 个 `setInterval` 定时器，但清理依赖调用方主动调用 `cleanup()`，极易遗漏。

**建议**：在 composable 内部使用 `tryOnUnmounted`（来自 `@vueuse/core`）自动注册清理：
```typescript
import { tryOnUnmounted } from "@vueuse/core";
// ...
tryOnUnmounted(cleanup);
```

---

## 🟢 低优先级 / 优化建议

### 14. 注释代码积压

以下文件存在大量被注释的代码，降低可读性：

| 文件 | 描述 |
|------|------|
| `src/store/modules/user.ts:3` | `//import { resetRouter }` |
| `src/store/modules/user.ts:105-106` | 注释掉的 logger 调用 |
| `src/store/modules/user.ts:252-257` | 注释掉的 persist 配置 |
| `src/router/index.ts:150-153` | 注释掉的权限检查绕过代码 |
| `src/environment.ts:5-43` | 大段注释掉的函数 |

**建议**：确认不再需要后，通过 git 历史追溯，直接删除。

---

### 15. `getRole()` 用 4 次 `find()` 实现角色优先级

**文件**：`src/store/modules/user.ts:61-80`

```typescript
// 4 次重复 roles.find()
if (roles.find(e => e === RoleEnum.Root) != undefined) ...
if (roles.find(e => e === RoleEnum.Admin) != undefined) ...
```

**建议**：
```typescript
const ROLE_PRIORITY = [RoleEnum.Root, RoleEnum.Admin, RoleEnum.Manager, RoleEnum.User];
return ROLE_PRIORITY.find(r => roles.includes(r as string)) ?? RoleEnum.None;
```

---

### 16. `ScenePlayer` 中连续两次 setTimeout 抖动修复

**文件**：`src/components/ScenePlayer/index.vue:2009-2010`

```typescript
setTimeout(() => handleResize(), 50);
setTimeout(() => handleResize(), 100);  // 双保险，代码味道
```

**建议**：使用 `ResizeObserver` 监听容器尺寸变化，或用 `nextTick` + 单次 `requestAnimationFrame`。

---

### 17. `web/index.vue` 本地实现 debounce

**文件**：`src/views/web/index.vue:249`

```typescript
const debounce = (fn: Function, delay: number) => { ... }  // 本地实现
```

项目已依赖 `@vueuse/core`，其中包含 `useDebounceFn`。应优先使用库提供的能力，避免本地重复实现。

---

### 18. ScenePlayer 中 `renderer!` 非空断言过度使用

**文件**：`src/components/ScenePlayer/index.vue`（多处）

```typescript
renderer!.domElement.addEventListener(...)
renderer!.render(scene, camera)
```

`renderer` 是 `ref<THREE.WebGLRenderer | null>`，在渲染循环和事件监听中大量使用 `!` 断言。应添加早返回守卫：

```typescript
if (!renderer.value) return;
```

---

### 19. `useScriptRuntime` 的 `startCountdown` 可用 Map 简化

**文件**：`src/composables/useEmailVerification.ts:109-195`

当前用 4 个独立变量 + 大型 switch-case 管理定时器，可以用 `Map` 统一管理，减少重复代码约 50 行。

---

## 🎯 总体评价

**优点**：
- TypeScript `any` 使用率极低（生产代码实际为 0），整体类型质量良好
- 无 `v-html` 使用，XSS 基础防护到位
- `console.log` 已统一由 `logger` 工具封装
- Token 存储使用 AES 加密（secure-ls），比明文 localStorage 更安全
- API 层已实现主备切换 Failover 机制
- 大型 composable（useEmailVerification）的 cleanup 思路清晰
- 路由模块化拆分合理
- 无 TODO/FIXME 注释积压

**主要风险点**：
1. 权限硬编码（高危，应最优先修复）
2. `@ts-nocheck` 覆盖核心脚本执行逻辑
3. Wechat 定时器泄漏
4. `new Function()` 执行路径需安全审计

---

*本报告由 Claude Code 自动生成，建议结合业务背景进行人工复核后再执行修复。*
