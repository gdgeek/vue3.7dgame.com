# 项目代码审查报告（第二轮）— vue3.7dgame.com

> 审查日期：2026-03-06
> 审查工具：Claude Code (claude-sonnet-4-6)
> 审查范围：`src/` 目录下全部 Vue / TypeScript 源文件
> 上轮修复状态：第一轮 5 个高优先级问题已全部修复

---

## 📊 本轮数据统计

| 指标 | 数值 |
|------|------|
| 新发现问题总数 | **20** |
| 🔴 高优先级 | **3** |
| 🟡 中优先级 | **9** |
| 🟢 低优先级 | **8** |
| i18n 硬编码违规点 | **15+**（分布在 5 个文件） |
| `Function` 裸类型使用 | **7 处** |
| `JSON.parse(JSON.stringify())` 反模式 | **5 处** |
| 空/静默 `catch {}` 块 | **20 处**（其中 3 处真正有问题） |
| `atob()` 无错误防护 | **4 处** |

---

## 🔴 高优先级问题（严重 bug 或安全问题）

### 1. `getModel` 重试逻辑完全失效（功能 Bug）

**文件**：
- `src/views/verse/script.vue:450-462`
- `src/views/meta/script.vue:403-415`

```typescript
// verse/script.vue:450
const getModel = (uuid: string, retries = 3) => {
  const source = scenePlayer.value?.sources.get(uuid);
  if (source && source.type === "model") {
    return source.data as THREE.Object3D;
  }
  if (retries > 0) {
    logger.log(`模型未找到，剩余重试次数: ${retries}`);
    setTimeout(() => getModel(uuid, retries - 1), 100); // ❌ 返回值被丢弃
  }
  return null; // 无论如何立刻返回 null
};
const model = getModel(modelUuid); // 永远是 null（若首次未找到）
if (!model) {
  logger.error(`找不到UUID为 ${modelUuid} 的模型`);
  return null; // ← 到这里就退出了，setTimeout 的重试毫无意义
}
```

**问题**：`setTimeout(() => getModel(...), 100)` 是 fire-and-forget。`getModel` 在模型未就绪时无论重试次数多少，都会**立即** `return null`，调用处立刻走入错误分支退出。100ms 后的重试根本没有 awaiter，其结果被完全丢弃。这是一个功能彻底失效的重试机制，表现为"模型偶发性加载失败"且日志显示有重试，让开发者误以为重试在生效。

**修复建议**：改为 Promise 包装，真正等待重试结果：

```typescript
const getModelAsync = (uuid: string, retries = 3): Promise<THREE.Object3D | null> => {
  return new Promise((resolve) => {
    const attempt = (remaining: number) => {
      const source = scenePlayer.value?.sources.get(uuid);
      if (source?.type === "model" && source.data) {
        resolve(source.data as THREE.Object3D);
        return;
      }
      if (remaining > 0) {
        setTimeout(() => attempt(remaining - 1), 100);
      } else {
        resolve(null);
      }
    };
    attempt(retries);
  });
};
// 调用处：
const model = await getModelAsync(modelUuid);
```

---

### 2. 硬编码 TTS 第三方 API 端点（安全 + 环境隔离问题）

**文件**：`src/views/audio/composables/useTTS.ts:121-124`

```typescript
const response = await axios.post(
  "https://sound.bujiaban.com/tencentTTS",  // ❌ 硬编码第三方域名
  params,
  { headers: { "Content-Type": "application/json" } }
);
```

**问题**：
1. 违反 CLAUDE.md 明确禁止的"硬编码域名/URL/密钥"规范；
2. 在 staging/production 环境切换时无法不同配置；
3. 该 URL 包含业务方的第三方服务商信息，一旦服务商变更需要改代码重新发布；
4. 没有经过 `src/utils/request.ts` 的统一拦截器，绕过了 Failover、鉴权 Token 注入等机制。

**修复建议**：
```typescript
// .env.development
VITE_TTS_API_URL=https://sound.bujiaban.com/tencentTTS

// .env.production
VITE_TTS_API_URL=https://sound.bujiaban.com/tencentTTS

// useTTS.ts
import env from "@/environment";
const response = await axios.post(
  env.tts_api_url,  // 从环境变量读取
  params,
  { headers: { "Content-Type": "application/json" } }
);
```

---

### 3. `atob()` 无异常防护（运行时崩溃风险）

**文件**：
- `src/views/audio/composables/useTTS.ts:128`
- `src/composables/useScriptEditorBase.ts:313`
- `src/views/meta/scene.vue:380`
- `src/views/verse/scene.vue:404`

```typescript
// useTTS.ts:128 - 解码服务端返回的音频 Base64
const audioData = atob(response.data.Audio);  // ❌ 无 try-catch

// useScriptEditorBase.ts:313 - 解码脚本内容
const binaryString = atob(base64Str);  // ❌ 无 try-catch

// scene.vue:380 - 解码截图数据
const byteString = atob(imageData.split(",")[1]);  // ❌ 无 try-catch
```

**问题**：`atob()` 对非法 Base64 输入会抛出 `DOMException: Failed to execute 'atob'`。若服务端返回损坏的 Base64（网络截断、编码错误）或 `imageData` 格式异常，会导致整个业务流程崩溃，用户看到未捕获错误。`useTTS.ts` 的外层 `try-catch` 可以兜底，但 `scene.vue` 中的调用没有外层保护。

**修复建议**：
```typescript
// 封装安全的 atob 工具
function safeAtob(str: string): string | null {
  try {
    return atob(str);
  } catch {
    logger.warn("[safeAtob] Invalid base64 string");
    return null;
  }
}

// 使用：
const audioData = safeAtob(response.data.Audio);
if (!audioData) {
  throw new Error(t("tts.synthesisError"));
}
```

---

## 🟡 中优先级问题（代码质量、可维护性）

### 4. `debounce` 函数在 4 个文件中完全重复

**文件**：
- `src/views/web/index.vue:249-257`
- `src/views/web/bbs.vue:80-89`
- `src/views/web/home.vue:78-87`
- `src/views/web/category.vue:65-74`

```typescript
// 每个文件都有完全相同的实现：
const debounce = (fn: Function, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: unknown[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};
```

**问题**：代码完全重复 4 份，且使用了裸 `Function` 类型（见问题 5）。项目已引入 `@vueuse/core`，内置了更完善的 `useDebounceFn`。

**修复建议**：
```typescript
// 删除本地实现，改用：
import { useDebounceFn } from "@vueuse/core";

const debouncedSaveScrollPosition = useDebounceFn(saveScrollPosition, 200);
```

---

### 5. 7 处裸 `Function` 类型（类型不安全）

**文件**：

| 文件 | 行号 | 用法 |
|------|------|------|
| `src/views/web/index.vue` | 249 | `fn: Function` |
| `src/views/web/bbs.vue` | 80 | `fn: Function` |
| `src/views/web/home.vue` | 78 | `fn: Function` |
| `src/views/web/category.vue` | 65 | `fn: Function` |
| `src/utils/downloadHelper.ts` | 24 | `t: Function` |
| `src/components/ScenePlayer/index.vue` | 1697 | `resolve: Function` |
| `src/views/campus/group.vue` | 128 | `result: Function` |

**问题**：裸 `Function` 类型不提供参数类型或返回类型信息，TypeScript 无法检查调用是否正确。

**修复建议**（各处对应的精确签名）：
```typescript
// downloadHelper.ts:24
t: (key: string, ...args: unknown[]) => string

// ScenePlayer/index.vue:1697
resolve: (value: void | PromiseLike<void>) => void

// debounce 函数参数
fn: (...args: unknown[]) => void

// campus/group.vue:128（需查看上下文确认签名）
result: (selected: GroupMember[]) => void
```

---

### 6. i18n 违规 — ElMessage 硬编码中文（UI 用户可见文案）

**文件 1**：`src/views/settings/edit.vue`（5 处）

```typescript
// :830
ElMessage.warning("邮箱未验证，请先完成邮箱验证后再修改密码");
// :871
ElMessage.error("邮箱未验证，请先完成邮箱验证后再修改密码");
// :954
ElMessage.warning("当前账号未绑定邮箱，请先前往邮箱验证页面绑定邮箱");
// :966, :992, :1023
ElMessage.warning("未获取到绑定邮箱，请刷新后重试");
```

**文件 2**：`src/components/Account/EmailVerificationPanel.vue`（5 处）

```typescript
// :370
return `${sendCooldown.value}秒后重试`;         // computed 中硬编码
// :377
return `${oldConfirmCooldown.value}秒后重试`;   // computed 中硬编码
// :379
return "发送旧邮箱验证码";                      // computed 中硬编码
// :454
ElMessage.success("验证码已发送到当前绑定邮箱");
// :475
ElMessage.success("旧邮箱验证成功，请继续完成新邮箱绑定");
// :496, :503
ElMessage.success("邮箱解绑成功");
```

**文件 3**：`src/components/MrPP/MrPPUpload/index.vue:152`

```typescript
ElMessage.error(`文件超过 ${props.maxSize}MB 限制: ${names}`);
```

**影响**：上述文案是用户可见的 UI 文案，在非中文环境下（英文/日文/泰文用户）会显示中文，直接影响国际化用户体验。

**修复建议**：将所有文案提取到 `src/lang/` 的 5 个语言文件，再通过 `t()` 调用：
```typescript
// lang/zh-CN.ts 添加：
"settings.email.notVerifiedWarning": "邮箱未验证，请先完成邮箱验证后再修改密码",
"settings.email.notBoundWarning": "当前账号未绑定邮箱，请先前往邮箱验证页面绑定邮箱",
// ...

// edit.vue：
ElMessage.warning(t("settings.email.notVerifiedWarning"));
```

---

### 7. i18n 违规 — 语言检测使用中文字符串作为内部枚举值

**文件**：`src/views/audio/composables/useLanguageAnalysis.ts`（多处）与 `useTTS.ts:109-113`

```typescript
// useLanguageAnalysis.ts: 129, 134, 137, 158-163, 184-191 等
detectedLanguage = "中文";   // ❌ 内部枚举用中文字符串
detectedLanguage = "日文";
detectedLanguage = "英文";

// useTTS.ts:109-113
PrimaryLanguage:
  props.voiceLanguage.value === "中文"  // ❌ 依赖中文字符串做分支判断
    ? 1
    : props.voiceLanguage.value === "英文"
      ? 2 : 3,
```

**问题**：将中文字符串 `"中文"`/`"英文"`/`"日文"` 同时作为内部状态机的枚举值和用于比较的 key。这导致：
1. 跨文件传递的内部状态依赖文化字符串，不符合设计原则；
2. 扩展新语言（如韩语、法语）时需要搜索所有比较字符串；
3. 内部状态与 i18n 展示字符串混用，逻辑耦合。

**修复建议**：引入语言代码枚举作为内部标识符，仅在显示时翻译：
```typescript
// 新建 src/types/language.ts
export type LanguageCode = "zh" | "en" | "ja" | "other";

// useLanguageAnalysis.ts 内部
detectedLanguage = "zh";  // 内部枚举

// 显示时翻译
const displayName = t(`tts.${detectedLanguage}`); // "中文"/"English"/"日本語"

// useTTS.ts
const LANG_TO_PRIMARY: Record<LanguageCode, number> = { zh: 1, en: 2, ja: 3, other: 1 };
PrimaryLanguage: LANG_TO_PRIMARY[props.voiceLanguage.value as LanguageCode] ?? 1,
```

---

### 8. i18n 违规 — logger 日志中的中文字符串（规范违反）

**文件**：`src/views/audio/composables/useTTS.ts:163, 199, 215, 254`

```typescript
logger.error("语音合成错误:", error);   // :163
logger.log("MD5计算进度:", p);           // :199
logger.log("上传进度:", p);              // :215
logger.error("上传错误:", error);        // :254
```

**文件**：`src/components/ScenePlayer/index.vue`（20+ 处 logger 调用含中文）

```typescript
logger.log("开始加载模型:", ...);        // :353
logger.warn("视频播放失败:", error);     // :445
logger.log("音频资源加载完成:", ...);    // :595
logger.error("创建文本实体失败:", error); // :676
// ... 共 20+ 处
```

**问题**：CLAUDE.md 明确禁止在源码中硬编码中文字符串（包括 logger 文本）。日志在国际化团队协作时不可读，且 ScenePlayer 单文件中 logger 调用有 20+ 处，是最严重的集中违规点。

**修复建议**：将 logger 标签改为英文（开发日志无需 i18n 框架，直接写英文即可）：
```typescript
logger.error("[TTS] Speech synthesis failed:", error);
logger.log("[TTS] MD5 progress:", p);
logger.log("[ScenePlayer] Loading model:", ...);
```

---

### 9. Failover 逻辑重复（DRY 违反）

**文件**：`src/utils/request.ts:19-41` 与 `src/api/domain-query.ts:26-54`

两处实现了几乎完全相同的：主/备 API 切换、`healthCheckTimer` 定时健康检查、恢复后切回主 API。经对比，代码相似度约 95%，唯一差别是健康检查 URL 的路径（`/health` vs `/api/health`）。

**建议**（同第一轮报告）：提取 `createFailoverAxios(primaryUrl, backupUrl, healthPath)` 工厂函数到 `src/utils/failover.ts`，两处共用。此问题持续存在，建议本迭代落地修复。

---

### 10. `JSON.parse(JSON.stringify())` 深克隆反模式（5 处）

**文件**：

| 文件 | 行号 | 说明 |
|------|------|------|
| `src/components/JsonSchemaForm/ArrayField.vue` | 74 | 克隆 schema default |
| `src/components/JsonSchemaForm/index.vue` | 77 | 克隆 schema default |
| `src/composables/useScriptEditorBase.ts` | 219 | 克隆场景数据 |
| `src/views/meta/scene.vue` | 290 | 克隆场景数据 |
| `src/views/verse/scene.vue` | 172 | 克隆场景数据 |

```typescript
// ❌ 慢、不支持 undefined/Date/Function/循环引用
JSON.parse(JSON.stringify(itemSchema.default))

// ✅ 推荐替换
structuredClone(itemSchema.default)
```

**注意**：`src/router/index.ts` 已正确使用 `structuredClone()`（第一轮已修复），应将同样的改进同步到上述 5 处。

---

### 11. wordpress.ts 静默失败（信息丢失）

**文件**：`src/api/home/wordpress.ts:72-78`

```typescript
try {
  const categories = await wordpressApi.getCategories();
  categoriesCache = new Map(categories.map((c) => [c.id, c]));
  return categoriesCache;
} catch {
  return new Map();  // ❌ 静默返回空 Map，完全丢失错误信息
}
```

**问题**：网络错误、API 错误、权限错误等所有异常都被静默吞掉，调用方得到空 Map，UI 显示空内容，但开发者无法从日志中定位问题。

**修复建议**：
```typescript
} catch (error: unknown) {
  logger.warn("[wordpress] Failed to fetch categories:", error);
  return new Map();
}
```

---

### 12. `useModelLoader.ts` 单文件 672 行，结构复杂

**文件**：`src/views/verse/composables/useModelLoader.ts`（672 行）

该文件混合了：GLTF 加载、VOX 模型解析、材质管理、动画处理、错误处理 5 个关注点，且有多个超过 50 行的函数（如 `loadModel`、`processEntity`）。

**建议**：
- 将 VOX 解析提取到 `src/utils/vox-parser.ts`；
- 将材质相关逻辑提取到 `useModelMaterial.ts`；
- `loadModel` 主函数保持在 30 行以内，其余为细粒度 helper。

---

## 🟢 低优先级 / 优化建议

### 13. `settings/edit.vue` 1256 行，可按功能拆分

**文件**：`src/views/settings/edit.vue`（1256 行）

该文件包含：个人资料编辑、密码修改、邮箱绑定/解绑、头像上传 4 个独立功能块，建议拆分为：
- `src/views/settings/components/ProfileSection.vue`
- `src/views/settings/components/PasswordSection.vue`
- `src/views/settings/components/EmailSection.vue`
- `src/views/settings/components/AvatarSection.vue`

---

### 14. `meta-verse/index.vue` 1177 行，事件处理逻辑内嵌

**文件**：`src/views/meta-verse/index.vue`（1177 行）

建议将场景列表逻辑提取到 `useMetaVerseList` composable，将卡片操作（publish/unpublish/delete）提取为独立子组件。

---

### 15. `useLanguageAnalysis.ts` 语言检测 if-else 链重复 5 次

**文件**：`src/views/audio/composables/useLanguageAnalysis.ts:47-68, 157-163, 184-200, 210-217, 228-229`

以下代码块重复出现 5 次：
```typescript
const detectedLanguageText =
  detectedLanguage === "中文" ? t("tts.chinese")
  : detectedLanguage === "英文" ? t("tts.english")
  : detectedLanguage === "日文" ? t("tts.japanese")
  : detectedLanguage;
```

**建议**：提取为纯函数，配合问题 7 的枚举重构：
```typescript
const getLanguageDisplayName = (code: LanguageCode): string => {
  const map: Record<LanguageCode, string> = {
    zh: t("tts.chinese"),
    en: t("tts.english"),
    ja: t("tts.japanese"),
    other: "",
  };
  return map[code] ?? code;
};
```

---

### 16. ScenePlayer `renderer!` 非空断言过度使用（同第一轮）

**文件**：`src/components/ScenePlayer/index.vue`（多处）

上一轮已指出，建议通过早返回守卫替代 `!` 断言。2080 行的组件可以先从最高风险的断言处开始改起。

---

### 17. `useLanguageAnalysis.ts` 中 `languageDetectionTimer` 无清理

**文件**：`src/views/audio/composables/useLanguageAnalysis.ts:38, 152-174`

```typescript
let languageDetectionTimer: number | null = null;
// ...
languageDetectionTimer = window.setTimeout(() => {
  ElMessage({ message: ..., duration: 5000 });
}, 3000);
```

该 composable 声明了 `languageDetectionTimer` 并在文本变化时重置，但没有 `tryOnUnmounted` 清理。若用户在 3 秒内卸载组件，会出现"ElMessage 在组件销毁后弹出"的情况。

**修复建议**：
```typescript
import { tryOnUnmounted } from "@vueuse/core";
tryOnUnmounted(() => {
  if (languageDetectionTimer) window.clearTimeout(languageDetectionTimer);
});
```

---

### 18. `campus/group.vue` 中 `result: Function` 回调类型缺失上下文

**文件**：`src/views/campus/group.vue:128`

```typescript
result: Function  // ❌
```

需要查看调用链确认精确类型，建议改为：
```typescript
result: (members: GroupMember[]) => void  // 或具体的选择器返回类型
```

---

### 19. `src/api/home/wordpress.ts:119` 的静默 catch 无注释

**文件**：`src/api/home/wordpress.ts:114-121`

```typescript
try {
  const domainStore = useDomainStoreHook();
  if (domainStore.blog) { ... }
} catch {
  // store 未初始化时忽略  ← 有注释，可接受
}
```

此处有注释说明意图，属于可接受的模式（Store 尚未初始化时跳过），但建议同时添加 `logger.debug` 提升可调试性。

---

### 20. `MrPPUpload/index.vue:152` 硬编码 MB 单位

**文件**：`src/components/MrPP/MrPPUpload/index.vue:152`

```typescript
ElMessage.error(`文件超过 ${props.maxSize}MB 限制: ${names}`);
```

`MB` 是硬编码的英文单位，中英文语境下都合适，但消息文案本身是中文，违反 i18n 规范。建议：
```typescript
ElMessage.error(t("upload.fileSizeExceeded", { size: props.maxSize, names }));
```

---

## 🎯 与第一轮对比总结

### 第一轮已修复（✅）
1. ✅ 权限列表硬编码绕过
2. ✅ `@ts-nocheck` 已移除
3. ✅ 定时器泄漏（Wechat.vue）
4. ✅ 全局命名空间污染
5. ✅ 僵尸 `refreshInterval` 引用

### 第一轮遗留未修复（⚠️ 仍存在）
- ⚠️ **Failover 逻辑重复**（问题 9）——同第一轮 §9，建议本轮落地
- ⚠️ **`Function` 裸类型**（问题 5）——同第一轮 §7，新增 ScenePlayer 实例
- ⚠️ **i18n 硬编码**（问题 6-8）——第一轮仅提到 useEmailVerification，本轮新发现 5 个文件

### 本轮新发现
- 🆕 `getModel` 重试逻辑功能性 Bug（问题 1）
- 🆕 硬编码 TTS API 端点（问题 2）
- 🆕 `atob()` 无异常防护（问题 3）
- 🆕 `debounce` 4 次重复实现（问题 4）
- 🆕 语言检测用中文字符串作内部枚举（问题 7）
- 🆕 logger 日志中文违规（问题 8，ScenePlayer 20+ 处）
- 🆕 `JSON.parse(JSON.stringify())` 5 处（问题 10）
- 🆕 wordpress.ts 静默失败（问题 11）

---

## 📋 修复优先级路线图

| 优先级 | 问题 | 估计工时 |
|--------|------|---------|
| P0 立即 | #1 getModel 重试 Bug | 1h |
| P0 立即 | #2 TTS 端点环境变量化 | 0.5h |
| P0 立即 | #3 atob() 加 try-catch | 1h |
| P1 本迭代 | #6-8 i18n 违规（15 处文案） | 3h |
| P1 本迭代 | #9 Failover 抽取（遗留）| 2h |
| P2 下迭代 | #4-5 debounce/Function 类型 | 1.5h |
| P2 下迭代 | #10 structuredClone 替换 | 0.5h |
| P2 下迭代 | #7 语言检测枚举化 | 2h |
| P3 持续 | #13-14 大文件拆分 | 4h+ |
| P3 持续 | #8 logger 日志英文化 | 1h |

---

## 🏆 总体评分

**综合评分：B+**（上轮 B 提升半级）

**提升原因**：
- 第一轮 5 个高优先级问题全部修复，说明团队响应能力强
- `any` 使用率依然极低，TypeScript 整体质量良好
- `structuredClone` 在 router 中已正确采用，显示团队在学习改进
- 大多数 `catch {}` 块经审查是有意图的（ElMessageBox 取消处理），非真正的静默吞错

**主要改进空间**：
- i18n 违规点较多（15+ 处），在非中文环境产品体验差
- `getModel` 重试 Bug 是功能性缺陷，应最高优先修复
- TTS 硬编码端点违反了团队规范，需要补充环境变量

---

*本报告由 Claude Code 自动生成（第二轮审查），建议结合业务背景进行人工复核后再执行修复。*
