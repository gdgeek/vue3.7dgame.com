# 密码策略前端适配 - 任务列表

## 任务

- [x] 1. 创建密码验证工具模块
  - [x] 1.1 创建 `src/utils/password-validator.ts`，实现 `PASSWORD_POLICY` 常量、`validatePassword`、`getPasswordStrength`、`isPasswordValid`、`createPasswordFormRules` 函数，导出 `PasswordRuleResult`、`PasswordValidationResult`、`PasswordStrength` 类型
  - [x] 1.2 编写属性测试 `test/unit/utils/password-validator.spec.ts`
    - [x] 1.2.1 P1: 长度规则正确性 — 任意字符串长度 < 12 则 minLength failed，> 128 则 maxLength failed
    - [x] 1.2.2 P2: 字符类别规则正确性 — uppercase/lowercase/digit/specialChar 规则与对应正则匹配一致
    - [x] 1.2.3 P3: isValid 与规则一致性 — `isValid(s) === rules.every(r => r.passed)`
    - [x] 1.2.4 P4: 强度等级单调性 — passCount 0-3 weak, 4-5 medium, 6 strong
    - [x] 1.2.5 P5: 验证结果结构完整性 — 始终返回 6 条规则，key/passed/message 字段完整
- [x] 2. 创建密码强度指示器组件
  - [x] 2.1 创建 `src/components/PasswordStrength/index.vue`，接受 `password` prop，使用 `validatePassword` 实时显示规则状态和强度等级，支持暗色主题
- [x] 3. 更新国际化文案
  - [x] 3.1 在各语言文件中添加 `passwordPolicy.*` 新 key（minLength, maxLength, uppercase, lowercase, digit, specialChar, strength.weak/medium/strong, description）
  - [x] 3.2 更新各语言文件中现有密码相关文案（login.rules.password.message2/message3, homepage.account.rules2.new.message2）反映新的 12 字符最小长度和特殊字符要求
- [x] 4. 注册页面适配
  - [x] 4.1 更新 `src/views/site/register/index.vue`：导入 `createPasswordFormRules` 替换硬编码 password rules，集成 `PasswordStrength` 组件，处理后端密码错误数组
  - [x] 4.2 更新 `src/components/Account/RegisterForm.vue`：同 4.1 的改动
- [x] 5. 密码重置页面适配
  - [x] 5.1 更新 `src/views/settings/account.vue`：新密码字段使用 `createPasswordFormRules`，集成 `PasswordStrength` 组件，旧密码规则保持不变
