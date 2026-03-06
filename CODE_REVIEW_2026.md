# Code Review Report — vue3.7dgame.com

> 审查日期：2026-03-06
> 审查人：Claude Code（资深前端架构师视角）
> 审查分支：openclaw/improvements
> 审查范围：`src/` 全量源代码（433 个文件，87,296 行）

---

## 项目审查报告

---

### 🔴 高优先级问题（建议尽快修复）

#### H1. 动态代码执行无沙箱隔离（安全漏洞）

**文件：**
- `src/views/meta/script.vue` 行 536–556
- `src/views/verse/script.vue` 行 603–623

**问题：**
```typescript
const createFunction = new Function(wrappedCode);
const executableFunction = createFunction();
await executableFunction(...arguments);
```

使用 `new Function()` 动态执行用户上传的脚本，与 `eval()` 风险等级相同：
- 无沙箱隔离，脚本可访问全局 `window`、`document`、`localStorage`
- 可执行任意代码（fetch 外部资源、修改 DOM、窃取 Token）
- 一旦 XSS 注入配合此机制，危害极大

**改进方案 A（Web Worker 沙箱，推荐）：**
```typescript
const executeInSandbox = (code: string): Promise<unknown> => {
  const blob = new Blob([`
    self.onmessage = async function(e) {
      try {
        const fn = new Function(e.data.code);
        const result = await fn();
        self.postMessage({ ok: true, result });
      } catch (err) {
        self.postMessage({ ok: false, error: String(err) });
      }
    };
  `], { type: 'application/javascript' });

  const worker = new Worker(URL.createObjectURL(blob));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Script execution timeout (5s)'));
    }, 5000);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      e.data.ok ? resolve(e.data.result) : reject(new Error(e.data.error));
    };
    worker.onerror = (e) => { clearTimeout(timer); worker.terminate(); reject(e); };
    worker.postMessage({ code });
  });
};
```

**改进方案 B（最低成本——执行前白名单校验）：**
```typescript
const FORBIDDEN_PATTERNS = [
  /window\s*\[/, /document\./, /localStorage/, /sessionStorage/,
  /fetch\s*\(/, /XMLHttpRequest/, /import\s*\(/, /require\s*\(/,
  /eval\s*\(/, /Function\s*\(/,
];

const validateScript = (code: string): { valid: boolean; reason?: string } => {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `禁止使用：${pattern.source}` };
    }
  }
  return { valid: true };
};
```

---

#### H2. 定时器未追踪，存在内存泄漏（生命周期问题）

**文件：**
- `src/components/ScenePlayer/index.vue` 行 2002–2003
- `src/components/Account/Wechat.vue` 行 175–182

**问题 A（ScenePlayer）：**
```typescript
// watch 回调中创建的 timeout 没有保存 ID，onUnmounted 无法清理
watch(() => props.isSceneFullscreen, () => {
  setTimeout(() => handleResize(), 50);   // 无法清理
  setTimeout(() => handleResize(), 100);  // 无法清理
});
```

**问题 B（Wechat）：**
```typescript
// 多处直接赋值给模块级变量，竞态条件下旧计时器可能泄漏
progressInterval = setInterval(() => { ... }, 1000);
intervalId = setInterval(fetchRefresh, 3000);
// 若组件快速销毁再创建，旧 interval 尚未清理就被覆盖
```

**改进方案——封装统一的计时器管理 composable：**
```typescript
// src/composables/useTimerManager.ts
export function useTimerManager() {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();

  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, delay);
    timers.add(id);
    return id;
  };
  const safeInterval = (fn: () => void, delay: number) => {
    const id = setInterval(fn, delay);
    intervals.add(id);
    return id;
  };
  const clearAll = () => {
    timers.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    timers.clear();
    intervals.clear();
  };

  onBeforeUnmount(clearAll);
  return { safeTimeout, safeInterval, clearAll };
}
```

---

#### H3. Cookie 缺少安全属性（CSRF / 中间人攻击风险）

**文件：** `src/store/modules/domain.ts` 行 20–41

**问题：**
```typescript
function setCookie(name: string, value: string, days: number) {
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
  // ❌ 缺少：Secure, SameSite=Strict
}
```

Cookie 中存储了域名信息，缺少安全属性：
- 无 `Secure`：HTTP 明文传输时也会发送 Cookie
- 无 `SameSite`：跨站请求时 Cookie 会被携带（CSRF 风险）

**改进方案：**
```typescript
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const secure = location.protocol === 'https:' ? ';Secure' : '';
  document.cookie =
    `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict${secure}`;
}
```

---

### 🟡 中优先级问题（迭代中改进）

#### M1. `catch` 块缺少类型收窄（TypeScript 规范）

**文件：** 多处（ScenePlayer、meta/script.vue、verse/script.vue）

**问题：**
```typescript
.catch((error) => {   // error 隐式推断为 any
  logger.error("播放失败:", error);
});
```

**改进方案：**
```typescript
.catch((error: unknown) => {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    logger.warn('自动播放被浏览器阻止');
  } else if (error instanceof Error) {
    logger.error('播放失败:', error.message);
  } else {
    logger.error('播放失败（未知错误）:', error);
  }
});
```

---

#### M2. `localStorage` 无加密存储视图状态

**文件：** `src/store/modules/tagsView.ts` 行 6, 11, 19

**问题：**
```typescript
// 直接写入 localStorage，无加密
JSON.parse(localStorage.getItem("visitedViews") || "[]")
localStorage.setItem("visitedViews", JSON.stringify(state.visitedViews));
```

虽然 tagsView 不含认证凭据，但路由访问记录属于用户行为数据，应当一致对待。

**改进方案：**
- 使用项目已引入的 `secure-ls` 实例（token.ts 中已配置）统一加密存储
- 或将 tagsView 状态改为 `sessionStorage`（页面关闭即清除）

---

#### M3. `btoa()` + `Uint8Array` 类型不安全

**文件：**
- `src/views/meta/script.vue` 行 338
- `src/views/verse/script.vue` 行 326

**问题：**
```typescript
const base64Str = btoa(String.fromCharCode.apply(null, uint8Array));
// Function.apply 第二个参数类型为 IArguments，传入 Uint8Array 类型不匹配
```

**改进方案：**
```typescript
// 安全且语义清晰的写法
const base64Str = btoa(
  Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join('')
);
```

---

#### M4. 超大单文件组件，维护性差

**文件：**
- `src/components/ScenePlayer/index.vue` — **2,080 行**
- `src/views/web/About.vue` — **1,348 行**
- `src/views/settings/edit.vue` — **1,256 行**

**问题：** 单个 Vue SFC 超过 1,000 行意味着：
- 职责混乱，难以 Code Review
- 编辑器类型检查性能下降
- 增量测试覆盖极难

**改进方案（以 ScenePlayer 为例）：**
```
src/components/ScenePlayer/
  index.vue             # 主入口，仅做组合
  SceneCanvas.vue       # WebGL/Three.js 渲染逻辑
  SceneControls.vue     # 控制面板
  SceneMedia.vue        # 视频/音频管理
  composables/
    useSceneResize.ts   # 窗口缩放处理
    useSceneEvents.ts   # 事件监听管理
    useScenePlayer.ts   # 播放状态管理
```

---

#### M5. 微信登录轮询无退避策略

**文件：** `src/components/Account/Wechat.vue` 行 175–182

**问题：**
```typescript
progressInterval = setInterval(() => {
  if (scanProgress.value < 85) scanProgress.value += 1;  // 进度卡在 85%，UX 差
}, 1000);

intervalId = setInterval(fetchRefresh, 3000);  // 无退避，服务端压力持续
```

**改进方案：**
```typescript
const MAX_ATTEMPTS = 40;    // 约 2 分钟
const BASE_INTERVAL = 2000;
let attempts = 0;

const pollLogin = () => {
  if (attempts >= MAX_ATTEMPTS) { emit('timeout'); return; }
  const delay = Math.min(BASE_INTERVAL * Math.pow(1.2, attempts), 10000);
  intervalId = setTimeout(async () => {
    await fetchRefresh();
    attempts++;
    if (!loginSuccess.value) pollLogin();
  }, delay);
};
```

---

#### M6. 无全局错误边界

**问题：** 项目未配置 Vue 全局错误处理器，组件内未捕获的异常会直接在控制台输出，生产环境无上报机制。

**改进方案：**
```typescript
// src/main.ts
app.config.errorHandler = (err: unknown, _instance, info) => {
  logger.error('[Global Error]', { err, info });
  // 上报到监控平台（Sentry / 自建）
  // reportError({ err, info });
};

app.config.warnHandler = (msg, _instance, trace) => {
  if (import.meta.env.DEV) {
    logger.warn('[Vue Warning]', msg, trace);
  }
};
```

---

### 🟢 低优先级 / 优化建议

#### L1. ~~路由克隆用 JSON.parse(JSON.stringify)~~ — 已修复 ✅

`src/router/index.ts` 行 163 已使用 `structuredClone(routes)`，正确。

---

#### L2. DOMPurify 使用正确，可进一步收紧白名单

**文件：** `src/views/web/components/News/index.vue`、`src/components/Home/Document.vue`

现状已正确（使用 DOMPurify），可进一步加固：
```typescript
const sanitizeHtml = (html: string) =>
  html ? DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a',
      'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel'],
  }) : '';
```

---

#### L3. 注释掉的临时权限代码需清理

**文件：** `src/router/index.ts` 行 150–152

```typescript
// // 临时跳过校园相关路由的权限检查
// if (!route.path.startsWith("/campus")) { ... }
```

建议确认状态后：已修复则删除注释；仍需跳过则改为带 issue 编号的 TODO。

---

#### L4. API Failover 缺少指数退避

**文件：** `src/utils/failover.ts`

当前只重试一次（布尔标志）。建议支持最多 3 次，间隔指数增长：
```typescript
config._retryCount = (config._retryCount || 0) + 1;
if (config._retryCount <= 3) {
  await new Promise(r => setTimeout(r, 1000 * Math.pow(2, config._retryCount - 1)));
  return instance(config);
}
```

---

#### L5. `availableVoices.ts` 静态数据文件过大（1,279 行）

建议改为从 API 动态获取（支持运营配置），或分割后按需 `import()`。

---

#### L6. 生产环境错误无远程上报

**文件：** `src/utils/logger.ts`

`logger.error` 在生产环境只打印到控制台，无法被监控平台捕获。建议集成 Sentry 或自建上报接口。

---

#### L7. 环境变量 URL 未做格式校验

**文件：** `src/environment.ts`

```typescript
// 建议对读取到的 URL 做格式校验
const safeUrl = (raw: string, fallback = ''): string => {
  if (!raw) return fallback;
  try { new URL(raw); return raw; }
  catch { console.warn(`[env] 无效 URL: ${raw}`); return fallback; }
};
```

---

### 📊 数据统计

| 指标 | 数值 |
|------|------|
| 源码文件总数（.ts + .vue） | **433** |
| 总代码行数 | **87,296** |
| Vue SFC 文件数 | 212 |
| TypeScript 文件数 | 221 |
| API 层文件数 | 58 |
| 最大单文件（ScenePlayer） | **2,080 行** |
| 超过 1,000 行的文件数 | 3 个 |
| `any` 类型使用（非注释） | 极少（已大幅改善）|
| `v-html` 使用处 | 4 处（均有 DOMPurify）|
| `console.log` 遗留 | 0（已通过 logger 封装）|
| `TODO/FIXME` 注释数量 | < 10 处 |
| `setInterval/setTimeout` 总数 | 30+ |
| 有生命周期清理钩子的组件 | 约 4 个（需加强）|
| `new Function()` 动态执行 | **2 处**（高风险）|
| 高优先级安全问题 | **3 项** |
| 中优先级问题 | **6 项** |
| 低优先级优化建议 | **7 项** |

---

### 安全性检查清单

| 检查项 | 状态 | 备注 |
|--------|------|------|
| XSS 防护（DOMPurify） | ✅ 已实现 | News/Document 组件均有防护 |
| Token 加密存储（secure-ls） | ✅ 已实现 | AES 加密 |
| 硬编码密钥/URL | ⚠️ 部分 | domain.ts 有备用域名 |
| 动态代码执行沙箱 | ❌ 缺失 | new Function() 无沙箱 |
| Cookie 安全属性 | ❌ 缺失 | 缺少 Secure/SameSite |
| 全局错误边界 | ❌ 缺失 | 无 app.config.errorHandler |
| API 错误统一拦截 | ✅ 已实现 | request.ts 拦截器 |
| CASL 权限管理 | ✅ 已实现 | 路由 + 组件级别 |
| 自动 Token 刷新 | ✅ 已实现 | 提前 5 分钟刷新 |
| 定时器生命周期管理 | ⚠️ 部分 | 多处存在泄漏风险 |

---

### 行动优先级

```
立即处理（本 Sprint）：
  H1. new Function() → Web Worker 沙箱
  H2. 定时器管理 → useTimerManager composable
  H3. Cookie 安全属性补充

计划处理（下个迭代）：
  M1. catch 块类型安全
  M2. tagsView localStorage 加密
  M4. ScenePlayer 拆分
  M6. 全局错误边界

长期优化：
  L2. DOMPurify 白名单收紧
  L4. Failover 指数退避
  L6. 生产错误远程上报
```

---

> 本报告由 Claude Code 自动生成，审查基于静态分析 + 代码抽样阅读。
> 建议结合运行时测试和安全扫描工具（ESLint security plugin、npm audit）进行补充验证。
