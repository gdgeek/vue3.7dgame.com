# 实现计划: 邮箱验证功能

## 概述

本实现计划将邮箱验证功能分解为一系列增量式的编码任务。每个任务都建立在前一个任务的基础上，最终完成完整的功能集成。实现将使用Vue 3 + TypeScript + Element Plus技术栈。

## 任务

- [x] 1. 创建API服务层
  - 创建 `src/api/v1/email.ts` 文件
  - 定义TypeScript类型接口（ApiResponse, ApiError, SendVerificationRequest, VerifyEmailRequest）
  - 实现 `sendVerificationCode` 函数，调用 `/v1/email/send-verification` 端点
  - 实现 `verifyEmailCode` 函数，调用 `/v1/email/verify` 端点
  - 使用项目现有的 `request` 工具（来自 `@/utils/request`）
  - _需求: 3.1, 3.2_

- [x] 1.1 为API服务层编写单元测试
  - 测试API端点URL正确性
  - 测试请求参数格式
  - 测试响应数据解析
  - _需求: 3.1, 3.2_

- [x] 2. 创建Composable函数
  - [x] 2.1 创建 `src/composables/useEmailVerification.ts` 文件
    - 定义状态变量（loading, error, countdown, isLocked, lockTime）
    - 定义计算属性（canSendCode, canVerify）
    - 实现倒计时管理逻辑（startCountdown函数）
    - 实现锁定倒计时逻辑（startLockCountdown函数）
    - _需求: 1.3, 2.4, 2.5_

  - [x] 2.2 实现sendCode方法
    - 调用API服务层的 `sendVerificationCode`
    - 处理成功响应，启动60秒倒计时
    - 处理错误响应，特别是RATE_LIMIT_EXCEEDED错误
    - 更新loading和error状态
    - _需求: 1.1, 1.3, 1.5_

  - [x] 2.3 实现verifyCode方法
    - 调用API服务层的 `verifyEmailCode`
    - 处理成功响应，清除倒计时
    - 处理错误响应，特别是INVALID_CODE和ACCOUNT_LOCKED错误
    - 更新loading和error状态
    - _需求: 2.1, 2.2, 2.4, 2.5_

  - [x] 2.4 实现cleanup方法
    - 清理所有定时器
    - 在组件卸载时调用
    - _需求: 通用清理_

- [x] 2.5 为Composable函数编写属性测试
  - **属性 2: 速率限制机制** - 测试60秒倒计时
  - **属性 8: 账户锁定机制** - 测试5次失败后锁定
  - **属性 9: 锁定状态下禁用验证** - 测试锁定期间的行为
  - **验证: 需求 1.3, 2.4, 2.5**

- [x] 3. 添加国际化文本
  - [x] 3.1 在中文语言文件中添加翻译键
    - 添加 `homepage.edit.emailVerification` 等标题文本
    - 添加表单标签文本（email, verificationCode）
    - 添加按钮文本（sendCode, verifyEmail）
    - 添加错误消息文本
    - 添加成功消息文本
    - _需求: 5.1, 5.3_

  - [x] 3.2 在英文语言文件中添加对应翻译
    - 添加所有与中文对应的英文翻译
    - _需求: 5.1, 5.3_

- [x] 3.3 为国际化编写测试
  - **属性 15: 翻译键完整性** - 测试所有翻译键存在
  - 测试语言切换功能
  - **验证: 需求 5.3, 5.4**

- [x] 4. 集成UI组件到设置页面
  - [x] 4.1 在 `src/views/settings/edit.vue` 中导入Composable
    - 导入 `useEmailVerification`
    - 导入 `useI18n` 用于国际化
    - 初始化Composable函数
    - _需求: 4.1_

  - [x] 4.2 添加邮箱验证表单HTML结构
    - 在现有表单后添加分隔线和新的表单区块
    - 添加邮箱输入框（el-input, type="email"）
    - 添加验证码输入框（el-input, maxlength="6"）
    - 添加"发送验证码"按钮（el-button）
    - 添加"验证邮箱"按钮（el-button）
    - 添加锁定提示（el-alert, v-if="isLocked"）
    - 使用响应式布局（el-row, el-col）
    - _需求: 4.2, 4.3, 4.4, 4.5, 4.8_

  - [x] 4.3 定义表单数据和验证规则
    - 创建 `emailForm` ref对象（email, code字段）
    - 定义 `emailRules` 验证规则（邮箱格式、验证码格式）
    - 创建 `emailFormRef` 表单引用
    - _需求: 1.4, 2.6, 7.1, 7.2_

  - [x] 4.4 实现事件处理函数
    - 实现 `handleSendCode` - 验证表单后调用sendCode
    - 实现 `handleVerify` - 验证表单后调用verifyCode
    - 实现 `handleCodeInput` - 过滤非数字字符，限制6位
    - 实现成功/错误消息显示（使用ElMessage）
    - _需求: 4.6, 4.9, 4.10, 7.3_

  - [x] 4.5 实现计算属性和响应式逻辑
    - 创建 `sendCodeButtonText` 计算属性（显示倒计时或"发送验证码"）
    - 绑定按钮禁用状态到 `canSendCode` 和 `canVerify`
    - 绑定loading状态到按钮和输入框
    - _需求: 4.6, 4.7_

  - [x] 4.6 添加组件卸载清理
    - 在 `onUnmounted` 钩子中调用cleanup方法
    - _需求: 通用清理_

- [x] 4.7 为UI组件编写单元测试
  - 测试所有表单元素是否正确渲染
  - 测试按钮禁用状态逻辑
  - 测试倒计时显示
  - 测试锁定提示显示
  - **验证: 需求 4.1-4.8**

- [x] 4.8 为UI组件编写属性测试
  - **属性 1: 有效邮箱发送验证码成功**
  - **属性 3: 无效邮箱格式拒绝**
  - **属性 4: 验证码格式验证**
  - **属性 5: 验证码输入过滤**
  - **属性 6: 正确验证码验证成功**
  - **属性 7: 错误验证码验证失败**
  - **属性 11: 错误消息显示**
  - **属性 12: 成功消息显示**
  - **属性 13: 必填字段验证**
  - **属性 14: 特殊字符处理**
  - **验证: 需求 1.1, 1.4, 2.1, 2.2, 2.6, 4.9, 4.10, 7.1-7.5**

- [x] 5. 实现错误处理逻辑
  - [x] 5.1 在Composable中添加错误处理
    - 处理NETWORK_ERROR - 显示网络错误消息
    - 处理VALIDATION_ERROR - 显示验证错误详情
    - 处理RATE_LIMIT_EXCEEDED - 启动倒计时并显示等待时间
    - 处理INVALID_CODE - 显示验证码错误消息
    - 处理ACCOUNT_LOCKED - 启动锁定倒计时并显示锁定信息
    - 处理INTERNAL_ERROR - 显示服务器错误消息
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 在UI组件中集成错误显示
    - 使用ElMessage显示错误消息
    - 错误消息自动清除（Element Plus默认行为）
    - _需求: 6.6_

- [x] 5.3 为错误处理编写单元测试
  - 测试每种错误类型的处理逻辑
  - 测试错误消息显示
  - 测试错误恢复机制
  - **验证: 需求 6.1-6.6**

- [x] 6. 添加样式和用户体验优化
  - [x] 6.1 添加CSS样式
    - 复用现有的 `.box-title`, `.box-margin-bottom` 等样式类
    - 确保与现有设置页面风格一致
    - 添加验证码输入框和按钮的flex布局样式
    - _需求: 4.1_

  - [x] 6.2 优化用户体验
    - 验证码输入框自动聚焦
    - 输入6位验证码后自动聚焦到验证按钮
    - 发送验证码成功后自动聚焦到验证码输入框
    - 添加loading状态的视觉反馈
    - _需求: 通用UX_

- [x] 7. 检查点 - 确保所有测试通过
  - 运行所有单元测试
  - 运行所有属性测试
  - 手动测试完整流程
  - 检查代码覆盖率（目标80%）
  - 如有问题，询问用户

- [x] 8. 集成测试和最终验证
  - [x] 8.1 编写端到端集成测试
    - 测试完整的邮箱验证流程
    - 测试错误场景的完整流程
    - 测试速率限制和账户锁定的完整流程
    - _需求: 所有需求_

  - [x] 8.2 进行手动测试
    - 在开发环境中测试所有功能
    - 测试中英文切换
    - 测试各种错误场景
    - 测试响应式布局（不同屏幕尺寸）
    - _需求: 所有需求_

  - [x] 8.3 代码审查和优化
    - 检查TypeScript类型定义的完整性
    - 检查代码风格一致性
    - 优化性能（如有必要）
    - 添加必要的代码注释
    - _需求: 通用代码质量_

- [x] 9. 最终检查点
  - 确保所有测试通过
  - 确保代码覆盖率达标
  - 确保所有需求都已实现
  - 询问用户是否有其他问题或需要调整的地方

## 注意事项

- 每个任务都引用了具体的需求，确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证特定示例和边缘情况
