# CLAUDE.md — vue3.7dgame.com 项目规范

> 本文件供 Claude Code 自动读取。每次任务开始前请遵守以下规范，无需用户重复说明。

---

## 项目简介

3D 游戏内容管理平台，基于 Vue3 + TypeScript + Vite 构建。
提供元宇宙/3D 场景的资源管理、课程管理、用户管理等功能。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3.5 (Composition API) |
| 语言 | TypeScript 5.7（strict 模式目标，逐步迁移中） |
| 构建 | Vite 5.4 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| HTTP | Axios（封装在 `src/utils/request.ts`） |
| UI | Element Plus |
| 国际化 | vue-i18n（支持 zh-CN / en-US / ja-JP / zh-TW / th-TH） |
| 测试 | Vitest 2.1.9 + Vue Test Utils |
| 包管理 | **pnpm only**（preinstall hook 禁止 npm/yarn） |
| Token 安全 | secure-ls AES 加密存储（`src/store/modules/token.ts`） |

---

## 目录结构

```
src/
  api/          # API 请求封装（按资源分目录）
  assets/       # 静态资源
  components/   # 公共组件
  composables/  # Vue composables（useXxx）
  environment.ts  # 环境变量读取入口
  lang/         # i18n 语言包（zh-CN/en-US/ja-JP/zh-TW/th-TH）
  router/       # 路由配置
  store/        # Pinia stores（modules/ 下按功能分文件）
  typings/      # 全局类型声明
  utils/        # 工具函数（request/domain/logger/token等）
  views/        # 页面组件
test/
  unit/         # 单元测试（镜像 src/ 目录结构）
```

---

## 编码规范

### TypeScript
- **禁止** 新增 `as any` 强转，必须写精确类型
- **禁止** `error: any`，使用 `unknown` + 类型收窄
- 新文件必须有完整类型注解，不依赖隐式推断
- 接口/类型命名：PascalCase，如 `UserInfo`、`TokenData`

### API 层（src/api/）
- 每个资源一个文件，导出具名函数
- 返回类型必须明确，如 `Promise<ApiResponse<UserInfo>>`
- 错误处理统一由 `src/utils/request.ts` 拦截器处理，API 层不重复处理

### 国际化
- **禁止**在源码中硬编码中文字符串（logger/UI文本）
- 新增文案必须同步到所有 5 个语言文件（zh-CN/en-US/ja-JP/zh-TW/th-TH）
- Key 命名：`模块.功能.描述`，如 `request.unknownError`

### 环境变量
- **禁止**在源码中硬编码域名/URL/密钥
- 统一通过 `import.meta.env.VITE_XXX` 读取
- 新增变量必须同步到 `.env.development` / `.env.staging` / `.env.production`

### 组件
- 使用 `<script setup lang="ts">` 语法
- Props 必须用 `defineProps<{}>()` 带类型
- Emit 必须用 `defineEmits<{}>()` 带类型

---

## 测试规范

- 测试文件位置：`test/unit/<镜像src路径>/<文件名>.spec.ts`
- API 测试模式（参考 `test/unit/api/resources.spec.ts`）：
  ```typescript
  vi.mock("@/utils/request")
  // beforeEach 中动态 import
  // 通过 request.mock.calls[0][0].url 断言请求 URL
  ```
- 每个公共函数/composable/store 都应有测试
- 覆盖率目标：lines ≥ 70%（CI 强制检查）
- 运行测试：`pnpm exec vitest run`
- 运行覆盖率：`pnpm run test:coverage`

### pnpm 完整路径（exec 环境中使用）
```
/home/ubuntu/.cache/node/corepack/v1/pnpm/9.15.0/bin/pnpm.cjs
```

---

## Git 规范

- **工作分支**：`openclaw/improvements`（所有 AI 改动在此分支累积）
- **禁止**直接提交到 `develop` 或 `main`
- Commit message 格式：`type(scope): 描述`
  - type: `feat` / `fix` / `refactor` / `test` / `chore` / `improve`
  - 例：`test: add unit tests for cyber API module`

---

## 已知问题 / 待处理

- `test/unit/composables/useDialogList.spec.ts` 和 `usePageData.spec.ts` 有少量失败（分页逻辑预存 bug，不是本次引入的）
- 部分 `.vue` 文件仍有 `as any` 强转，逐步消除中
- strict TypeScript 模式尚未全量开启

---

## 禁止事项

1. 不要安装 npm 或 yarn，只用 pnpm
2. 不要删除 `.env.*` 文件中已有的变量
3. 不要修改 `pnpm-lock.yaml` 以外的锁文件
4. 不要在代码中写死密钥或敏感信息
5. 不要合并到 develop/main，交给用户决定
