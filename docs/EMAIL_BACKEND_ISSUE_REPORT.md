# 邮箱解绑异常排查结论（给后端）

## 结论
这是**后端问题为主**，不是前端逻辑主因。

当前同一账号在同一后端（`http://localhost:8081`）下出现了邮箱数据源不一致：
- `GET /v1/user/info` 显示邮箱为空
- `GET /v1/email/status` 显示有邮箱但未验证

并且后端对解绑的前置条件是“必须已验证邮箱”，导致用户即使“看起来已绑定邮箱”，仍无法解绑。

---

## 复现环境
- 前端：`http://localhost:3001`
- API：`http://localhost:8081`
- 测试账号：`dirui`
- 时间：2026-02-25

> 备注：本地联调统一使用 `http://localhost:8081`。

---

## 复现与证据

### 1) 登录成功
`POST /v1/auth/login` 返回 `success: true`。

### 2) 用户信息接口
`GET /v1/user/info`

返回关键字段：
- `email: null`
- `emailBind: null`

### 3) 邮箱状态接口
`GET /v1/email/status`

返回关键字段：
- `email: "dirui1981@gmail.com"`
- `email_verified: false`

### 4) 解绑接口
`POST /v1/email/unbind`

返回：
- `success: false`
- `error.code: "INVALID_REQUEST"`
- `error.message: "当前邮箱未验证，无法解绑"`

### 5) 改绑前置接口
`POST /v1/email/send-change-confirmation`

返回：
- `success: false`
- `error.code: "INVALID_STATE"`
- `error.message: "当前账号未绑定已验证邮箱"`

---

## 问题拆解

1. **数据不一致问题**
- `user/info` 与 `email/status` 对同一用户返回的邮箱状态冲突。
- 前端无法基于单一可靠来源展示“是否已绑定/可解绑”。

2. **解绑策略与用户预期不一致**
- 当前后端策略是：仅“已验证邮箱”才可解绑。
- 用户看到有邮箱即认为“已绑定可解绑”，但被后端拒绝。

3. **接口语义不清**
- “已绑定”与“已验证”的关系未在通用用户信息接口中明确。
- `emailBind` 返回 `null`（非布尔），增加前端判断歧义。

---

## 后端修复建议（必须）

1. 统一邮箱状态单一事实源（Single Source of Truth）
- `user/info` 与 `email/status` 必须来自同一状态模型，避免冲突。
- 至少保证以下字段一致：`email`、`email_verified`、`emailBind`。

2. 规范 `user/info` 字段类型
- `emailBind` 必须始终为布尔值（`true/false`），不要返回 `null`。
- 建议新增或保证返回：`email_verified`（布尔）与 `email_verified_at`。

3. 明确解绑业务规则并固化到接口契约
- 若规则为“未验证邮箱不可解绑”，请在 API 文档明确写出。
- 推荐返回统一错误码：`INVALID_STATE`，避免与参数错误 `INVALID_REQUEST` 混用。

4. 校正改绑前置接口错误码
- 当前 `verify-change-confirmation` 在未满足前置条件时返回 `INVALID_CODE`，语义不准确。
- 建议改为 `INVALID_STATE`（未绑定/未验证/流程非法）。

---

## 建议的契约（供后端确认）

- 可解绑条件：
  - 方案 A：只要有绑定邮箱即可解绑；
  - 方案 B：必须“已验证邮箱”才可解绑（当前实现）。
- 请二选一并在 `EMAIL_API_FOR_FRONTEND.md` 明确。

若采用方案 B，建议补充接口字段：
- `GET /v1/email/status` 返回 `can_unbind: boolean` 与 `reason`（可选）
- 前端可直接据此渲染按钮状态与提示。

---

## 回归用例（后端修复后）

1. 已绑定未验证邮箱
- `user/info` 与 `email/status` 一致
- `unbind` 返回符合约定的错误码与消息

2. 已绑定已验证邮箱
- `send-change-confirmation` 成功
- `unbind` 在验证码正确时成功

3. 未绑定邮箱
- `status.email = null`
- 所有改绑/解绑前置接口返回一致的 `INVALID_STATE`

4. 字段类型检查
- `emailBind` 永远为布尔值
