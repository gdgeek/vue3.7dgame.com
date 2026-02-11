---
inclusion: auto
---

# 安全规则

> 改编自 Everything Claude Code 的 security 规则。

## 强制检查清单

每次代码变更前，检查以下项目：

### 1. 敏感信息

- 禁止硬编码密钥、token、密码
- 使用环境变量管理敏感配置
- `.env` 文件不得提交到 Git
- 检查 `.gitignore` 是否包含敏感文件

### 2. 输入验证

- 所有用户输入必须验证和清理
- API 参数使用类型检查
- 文件上传验证类型和大小
- URL 参数进行编码处理

### 3. XSS 防护

- 不使用 `v-html` 渲染用户输入
- 动态内容使用模板插值（自动转义）
- 第三方内容使用 DOMPurify 清理

### 4. API 安全

- 所有 API 调用使用 HTTPS
- 认证 token 存储在安全位置（httpOnly cookie 优先）
- 实现请求速率限制
- 敏感操作需要二次确认

### 5. 依赖安全

- 定期检查依赖漏洞：`npm audit`
- 锁定依赖版本（使用 lock 文件）
- 避免使用不维护的包

### 6. 前端特定

- CORS 配置最小化
- CSP（Content Security Policy）配置
- 避免在 URL 中传递敏感信息
- localStorage 不存储敏感数据
