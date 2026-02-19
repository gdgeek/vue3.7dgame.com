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
