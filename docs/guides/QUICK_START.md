# 🚀 快速开始指南

## 项目概述

**Mixed Reality Programming Platform** - 基于 Vue 3 + Vite + TypeScript 的混合现实编程平台

- 📦 版本：2.11.3
- 🎯 技术栈：Vue 3.5.13 + Vite 5.4.18 + TypeScript 5.8.3 + Element Plus 2.9.7
- 🌐 在线地址：http://localhost:3002/

---

## 环境要求

- **Node.js**: >= 18.0.0（当前：v23.5.0 ✅）
- **包管理器**: pnpm 9.15.1
- **操作系统**: macOS / Linux / Windows

---

## 快速启动

### 1️⃣ 克隆项目（如果还没有）

```bash
git clone <repository-url>
cd vue3.7dgame.com
```

### 2️⃣ 安装依赖

```bash
pnpm install
```

### 3️⃣ 启动开发服务器

```bash
pnpm run dev
```

项目将在 http://localhost:3002/ 启动（如果 3001 端口被占用）

### 4️⃣ 构建生产版本

```bash
pnpm run build
```

---

## 常用命令

### 开发相关

```bash
# 启动开发服务器
pnpm run dev

# 类型检查
pnpm run type-check

# 预览生产构建
pnpm run preview
```

### 代码质量

```bash
# ESLint 检查并修复
pnpm run lint:eslint

# Prettier 格式化
pnpm run lint:prettier

# Stylelint 检查并修复
pnpm run lint:stylelint

# 项目健康检查
pnpm run check
```

### 测试

```bash
# 运行测试（watch 模式）
pnpm run test

# 运行测试（单次）
pnpm run test:run

# 测试覆盖率
pnpm run test:coverage

# 测试 UI
pnpm run test:ui
```

### Git 提交

```bash
# 使用交互式提交（推荐）
pnpm run commit

# 或使用标准 git commit
git commit -m "feat: 新功能"
```

### 工具脚本

```bash
# 清理缓存和构建文件
pnpm run clean

# 项目健康检查
pnpm run check

# 替换 console 为 logger
pnpm run replace-console
```

---

## 项目结构

```
vue3.7dgame.com/
├── src/
│   ├── api/              # API 接口
│   ├── assets/           # 静态资源
│   ├── components/       # 公共组件
│   ├── directive/        # 自定义指令
│   ├── enums/            # 枚举定义
│   ├── lang/             # 国际化
│   ├── layout/           # 布局组件
│   ├── plugins/          # 插件
│   ├── router/           # 路由配置
│   ├── store/            # 状态管理
│   ├── styles/           # 全局样式
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── public/               # 公共资源
├── scripts/              # 工具脚本
├── tests/                # 测试文件
├── .env.development      # 开发环境配置
├── .env.production       # 生产环境配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目配置
```

---

## 环境配置

### 开发环境 (.env.development)

```bash
# 应用端口
VITE_APP_PORT=3001

# API 配置
VITE_APP_API_URL="http://localhost:81"

# 是否启用 Mock 服务
VITE_MOCK_DEV_SERVER=false
```

### 切换到线上 API

取消注释 `.env.development` 中的线上配置：

```bash
# VITE_APP_API_URL="https://api.bupingfan.com"
```

---

## 多域名构建

项目支持多个域名的独立构建：

```bash
# 不同域名构建
pnpm run build:mrpp_com
pnpm run build:4mr_cn
pnpm run build:01xr_com
pnpm run build:7dgame_com
pnpm run build:1ucb_com
pnpm run build:voxelparty_com
```

---

## 开发规范

### 代码提交规范

使用 Commitizen 进行交互式提交：

```bash
pnpm run commit
```

提交类型：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建相关
- `ci`: CI 配置
- `chore`: 其他修改

### 代码风格

项目使用：
- **ESLint**: JavaScript/TypeScript 代码检查
- **Prettier**: 代码格式化
- **Stylelint**: CSS/SCSS 代码检查

提交前会自动运行 lint-staged 检查。

---

## 常见问题

### Q1: 端口被占用怎么办？

Vite 会自动尝试下一个可用端口。你也可以修改 `.env.development` 中的 `VITE_APP_PORT`。

### Q2: 依赖安装失败？

```bash
# 清理缓存
pnpm run clean

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q3: TypeScript 报错？

```bash
# 运行类型检查
pnpm run type-check

# 重启 VSCode
```

### Q4: 如何使用 Mock 数据？

修改 `.env.development`：

```bash
VITE_MOCK_DEV_SERVER=true
```

### Q5: 如何查看项目健康状态？

```bash
pnpm run check
```

---

## 开发工具推荐

### VSCode 扩展

- **Vue - Official**: Vue 3 语言支持
- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **Stylelint**: CSS 检查
- **GitLens**: Git 增强
- **Error Lens**: 错误提示增强

### 浏览器扩展

- **Vue DevTools**: Vue 调试工具

---

## 性能优化

项目已配置：
- ✅ 代码分割（Vue、Element Plus、Three.js 等）
- ✅ Gzip 压缩
- ✅ 按需导入组件
- ✅ 图标按需加载
- ✅ 路由懒加载

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t mrpp:latest .

# 运行容器
docker run -p 80:80 mrpp:latest
```

### Nginx 部署

```bash
# 构建
pnpm run build

# 上传 dist 目录到服务器
scp -r dist/* user@server:/usr/share/nginx/html/

# Nginx 配置参考 nginx.conf
```

---

## 获取帮助

- 📖 查看 [IMPROVEMENTS.md](./IMPROVEMENTS.md) 了解改进建议
- 🐛 提交 Issue 报告问题
- 💬 加入开发者交流群

---

## 项目状态

✅ **当前状态：运行中**

- 服务地址：http://localhost:3002/
- Vue DevTools：http://localhost:3002/__devtools__/
- 依赖状态：✅ 已安装（1438 个包）
- 类型检查：✅ 通过
- 代码规范：⚠️ 424 处 console 待优化

---

## 下一步

1. ✅ 项目已启动
2. 📝 阅读 [IMPROVEMENTS.md](./IMPROVEMENTS.md) 了解改进计划
3. 🔧 根据需要调整环境配置
4. 💻 开始开发！

---

**祝开发愉快！** 🎉
