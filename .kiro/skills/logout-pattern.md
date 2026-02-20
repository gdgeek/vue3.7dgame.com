# 退出登录统一模式

## 核心原则

退出登录应该只有一个入口点和一个处理中心，避免在多个视图中重复实现。

## 本项目约定

- 统一路由：`/site/logout` → `src/views/site/logout/index.vue`
- 统一方法：`userStore.logout()` 负责所有清理工作
- 所有需要退出的地方只做 `router.push("/site/logout")`

## logout() 应包含的步骤

1. 调用后端 API（`AuthAPI.logout()`），忽略失败
2. 使用 `Token.removeToken()` 清除 token（不要用 `setItem("")`）
3. 清空用户信息
4. 清除定时器等副作用

## 常见踩坑

- `router.push("/logout")` 是错的，正确路径是 `router.push("/site/logout")` — `/logout` 无对应路由，会被 permission guard 拦截跳回主页
- `localStorage.setItem(key, "")` vs `localStorage.removeItem(key)` — 前者留残留，后者才干净
- 不要在多个视图中 watch 路由来处理退出，交给 logout 页面统一处理
- 路由不要重复定义同一路径，会产生冲突
