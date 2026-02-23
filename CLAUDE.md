# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

## 项目概述

这是一个基于 Vue3 的混合现实编程平台（MRPP）- 使用 Vue3 + Vite5 + TypeScript5 + Element-Plus + Pinia 构建的多域名管理模板。项目支持多个域名的白标化部署（mrpp_com、4mr_cn、01xr_com、7dgame_com、1ucb_com、voxelparty_com）。

**核心功能：**
- 集成 Three.js 的 3D 场景编辑器
- 场景导出/导入系统（基于 ZIP 和清单文件）
- 多语言支持（简体中文、繁体中文、英文、日文、泰文）
- 动态路由和权限系统
- API 故障转移机制（主备切换）
- 基于 CASL 的授权系统

## 开发命令

### 包管理器
本项目**强制使用 pnpm**。`preinstall` 脚本会强制执行此规则。

```bash
# 安装依赖
pnpm install

# 开发服务器（默认端口：3001）
pnpm run dev

# 类型检查
pnpm run type-check
vue-tsc --noEmit

# 生产构建
pnpm run build                    # 生产环境构建
pnpm run build:staging            # 预发布环境构建
pnpm run build:7dgame_com         # 特定域名构建

# 预览生产构建
pnpm run preview
```

### 测试

```bash
# 运行所有测试
pnpm run test

# 运行测试一次（非监听模式）
pnpm run test:run

# 运行特定测试文件
npx vitest run test/unit/services/scene-package/

# 生成覆盖率报告
pnpm run test:coverage

# 测试 UI
pnpm run test:ui
```

### 代码质量

```bash
# 代码检查和修复
pnpm run lint:eslint
pnpm run lint:prettier
pnpm run lint:stylelint

# 预提交检查（通过 Husky 自动运行）
pnpm run lint:lint-staged

# Git 提交（交互式 commitizen）
pnpm run commit
```

### Storybook

```bash
# 运行 Storybook 开发服务器
pnpm run storybook

# 构建 Storybook
pnpm run build-storybook
```

### 工具脚本

```bash
# 清理构建产物
pnpm run clean

# 检查项目健康状态
pnpm run check

# 替换 console 语句
pnpm run replace-console
```

## 架构

### 目录结构

```
src/
├── api/                    # API 层
│   ├── v1/                 # 版本化的 API 模块
│   ├── auth/               # 认证 API
│   ├── menu/               # 菜单/路由 API
│   └── domain-query.ts     # 域名配置 API
├── views/                  # 页面组件（路由视图）
│   ├── home/               # 首页
│   ├── verse/              # 3D 场景编辑器
│   ├── meta/               # Meta/实体管理
│   ├── campus/             # 校园模块
│   ├── game/               # 游戏管理
│   └── web/                # 公开网站页面
├── components/             # 可复用组件
├── router/                 # Vue Router 配置
│   └── modules/            # 路由模块（public、home、verse 等）
├── store/                  # Pinia 状态管理
│   └── modules/            # Store 模块（user、permission、domain 等）
├── services/               # 业务逻辑服务
│   └── scene-package/      # 场景导出/导入服务
├── composables/            # Vue 组合式函数
├── utils/                  # 工具函数
├── lang/                   # 国际化翻译
├── styles/                 # 全局样式和主题
├── assets/                 # 静态资源
├── types/                  # TypeScript 类型定义
├── enums/                  # 枚举和常量
├── plugins/                # Vue 插件
├── directive/              # 自定义指令
└── lib/                    # 第三方库封装
```

### 核心架构模式

#### 1. 多域名配置
- 通过 `.env.*` 文件进行基于环境的构建
- 运行时通过 `domain-query.ts` 加载域名特定配置
- `src/store/modules/domain.ts` 管理域名特定设置
- `src/environment.ts` 提供集中的环境访问

#### 2. API 层
- `src/utils/request.ts` 中的集中式 axios 实例
- API 故障转移：主 API 失败时自动切换到备用 API
- 通过 `src/store/modules/token.ts` 管理 Token
- API 模块按版本组织（`api/v1/`）

#### 3. 路由
- 路由拆分到 `src/router/modules/` 中的模块
- 基于用户权限的动态路由加载
- 布局组件：`src/layout/index.vue`
- 通过 `src/store/modules/permission.ts` 进行权限控制

#### 4. 状态管理
- 使用持久化的 Pinia stores（`pinia-plugin-persistedstate`）
- Store 模块：`app`、`user`、`permission`、`domain`、`settings`、`tagsView`
- Token 单独存储在 `src/store/modules/token.ts`

#### 5. 场景导出/导入系统
位于 `src/services/scene-package/`：
- **export-service.ts**：下载场景数据、资源并打包为 ZIP
- **import-service.ts**：解压 ZIP、上传资源、创建场景
- 使用 UUID 映射处理跨环境的 ID 冲突
- 清单格式在 API 类型中定义（`src/api/v1/scene-package.ts`）

**后端 API 依赖：**
- `GET /v1/verses/{id}/export` - 返回完整的场景树
- `POST /v1/verses/import` - 从清单创建场景

#### 6. 自动导入配置
- Vue API、VueUse、Pinia、Vue Router 自动导入
- Element Plus 组件和图标自动导入
- `src/components` 和 `src/**/components` 中的自定义组件自动导入
- **重要**：自动生成已禁用（vite.config.ts 中 `dts: false`）。如果添加新组件，临时启用它，然后再禁用。

## 环境配置

### 开发环境
编辑 `.env.development`：
- `VITE_APP_PORT`：开发服务器端口（默认：3001）
- `VITE_APP_API_URL`：后端 API 地址（本地或远程）
- `VITE_MOCK_DEV_SERVER`：启用 Mock 服务器（`true`/`false`）
- `VITE_APP_BLOCKLY_URL`：Blockly 编辑器地址
- `VITE_APP_EDITOR_URL`：代码编辑器地址

### 生产构建
每个域名都有自己的构建模式：
- `pnpm run build:7dgame_com` 使用 `.env.7dgame_com`（如果存在）或 `.env.production`
- 域名特定设置在运行时从后端加载

## 测试指南

- 测试文件位于 `test/unit/`
- 使用 Vitest 和 jsdom 环境
- 全局测试工具可用（describe、it、expect）
- 场景包测试：`test/unit/services/scene-package/`
- 运行特定测试：`npx vitest run <path>`

## 代码风格

- 强制执行 ESLint + Prettier + Stylelint
- Husky 预提交钩子运行代码检查
- 使用 Commitizen 规范提交
- 使用 `pnpm run commit` 进行引导式提交

## 重要注意事项

1. **禁止使用 npm 或 yarn** - 强制使用 pnpm
2. **自动导入类型**：保持 `dts: false`，除非重新生成类型
3. **API 故障转移**：应用会在主 API 失败时自动切换到备用 API
4. **Token 管理**：使用 `Token` store，不要直接使用 localStorage
5. **环境变量**：通过 `import.meta.env.VITE_*` 或 `src/environment.ts` 访问
6. **场景导出/导入**：复杂功能，使用 UUID 映射 - 参见 `src/services/scene-package/`
7. **多域名**：域名配置动态加载，不仅仅从环境文件
8. **Three.js**：用于场景编辑器中的 3D 场景渲染
9. **国际化**：所有面向用户的文本必须国际化

## 常用模式

### API 请求
```typescript
import request from '@/utils/request';

// GET 请求
const data = await request.get<ResponseType>('/api/endpoint');

// POST 请求
const result = await request.post('/api/endpoint', payload);
```

### Store 使用
```typescript
import { useUserStore } from '@/store';

const userStore = useUserStore();
userStore.someAction();
```

### 路由定义
```typescript
// 在 src/router/modules/*.ts 中
export const myRoutes: RouteRecordRaw = {
  path: '/my-path',
  component: Layout,
  children: [...]
};
```

### 国际化
```typescript
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const message = t('key.path');
```
