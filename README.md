# Mixed Reality Programming Platform - Frontend

混合现实编程平台前端项目，基于 Vue 3 + Vite 5 + TypeScript + Element Plus 构建。

## 技术栈

- Vue 3.4 + Composition API
- Vite 5
- TypeScript 5
- Element Plus
- Pinia 状态管理
- Vue Router
- Vue I18n（中文/英文/繁体中文/泰语/日语）
- Vitest 单元测试

## 快速开始

```bash
# 安装依赖
pnpm install

# 本地开发
pnpm run dev

# 构建生产版本
pnpm run build

# 运行测试
pnpm run test:run
```

## 多环境构建

```bash
pnpm run build              # 生产环境
pnpm run build:staging      # 预发布环境
pnpm run build:mrpp_com     # mrpp.com
pnpm run build:4mr_cn       # 4mr.cn
pnpm run build:01xr_com     # 01xr.com
pnpm run build:7dgame_com   # 7dgame.com
pnpm run build:1ucb_com     # 1ucb.com
pnpm run build:voxelparty_com # voxelparty.com
```

## 项目结构

```
src/
├── api/              # API 接口定义
│   ├── auth/         # 认证相关
│   ├── v1/           # v1 版本 API
│   └── ...
├── components/       # 公共组件
├── lang/             # 国际化文案
├── layout/           # 布局组件
├── router/           # 路由配置
├── services/         # 业务服务层
├── store/            # Pinia 状态管理
├── utils/            # 工具函数
├── views/            # 页面视图
└── typings/          # 类型声明
test/
└── unit/             # 单元测试
```

## Docker 部署

```bash
docker build -t mrpp-frontend .
docker run -p 80:80 mrpp-frontend
```

## License

MIT
