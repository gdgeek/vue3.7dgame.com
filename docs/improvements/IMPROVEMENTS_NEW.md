# 项目改进建议

> 基于代码审查和最佳实践，整理的项目改进方向（2026-02-22）
> 最后更新：2026-02-27

## 🟢 已完成高优先级项（2026-02-27 更新）

### 1. TypeScript 类型安全 ✅ 已完成

**原问题：** 大量使用 `any` 类型（601 处警告）

**完成情况：**
- ✅ 创建了 16 个类型定义文件（`src/api/v1/types/`）
- ✅ 修复了全部 20+ 个 API 模块的类型定义
- ✅ **当前 ESLint `any` 警告：0**（从 601 完全清零）

**改进方案（已实施）：**
```typescript
// ✅ 已改进
function handleData(data: UserData) { ... }
```

**类型文件结构：**
```
src/api/v1/types/
├── common.ts, auth.ts, verse.ts, meta.ts
├── group.ts, prefab.ts, wechat.ts, cyber.ts
├── phototype.ts, vp-map.ts, meta-resource.ts
├── edu-class.ts, edu-school.ts, file.ts, user.ts
└── edu/ (student.ts, teacher.ts)
```

---

### 2. 测试覆盖率 ✅ 大幅改善

**原状：**
- 416 个源文件，仅 5 个测试文件，覆盖率 < 5%

**当前状态（2026-02-27）：**
- ✅ **57 个测试文件**（从 5 增长到 57）
- ✅ 覆盖 API 层、Store 层、Utils 层、Composables、Views

**已覆盖模块：**
- `test/unit/api/` - 20 个 API 模块测试
- `test/unit/store/` - 11 个 Store 测试
- `test/unit/utils/` - 10 个工具函数测试
- `test/unit/composables/` - 5 个 Composables 测试
- `test/unit/services/` - 场景导出/导入测试
- `test/unit/views/` - 隐私政策等页面测试

**待完善：**
- 大型视图组件（ScenePlayer.vue、script.vue）的集成测试
- 长期目标：整体覆盖率 70%+

---

### 3. 控制台日志泄露 ✅ 基本完成

**原问题：** 143 处 `console.log` 残留

**当前状态（2026-02-27）：**
- ✅ 已创建统一日志工具 `src/utils/logger.ts`（开发环境显示，生产环境自动禁用）
- ✅ 从 143 处减少至 **6 处**（仅剩少量在复杂视图组件中）
- 剩余 6 处位置：`AIProcess.vue`、`MrPPCropper.vue`、`logger.ts`（自身测试用）、`ai/index.vue`、`meta/script.vue`、`verse/script.vue`

---

### 4. 依赖管理优化

**问题：**
- `node_modules` 体积 887MB（偏大）
- 部分依赖可能未使用

**改进方案：**

```bash
# 1. 检查未使用的依赖
npx depcheck

# 2. 分析包体积
npx vite-bundle-visualizer

# 3. 审计依赖
pnpm audit
```

**优化建议：**
- 移除未使用的依赖（如前端项目中的 `express`）
- 使用 CDN 加载大型库（Three.js、ECharts）
- 按需导入 Element Plus 组件

---

### 5. 性能优化

**5.1 代码分割优化**
```typescript
// vite.config.ts - 按业务模块分割
manualChunks: {
  'vue-core': ['vue', 'vue-router', 'pinia'],
  'element-plus': ['element-plus'],
  'three': ['three'],
  // 新增：按业务模块分割
  'verse-editor': [
    './src/views/verse',
    './src/components/Meta'
  ]
}
```

**5.2 组件懒加载**
```typescript
// router/index.ts
const VerseEditor = () => import('@/views/verse/view.vue');
```

**5.3 性能监控**
```typescript
// 添加 Web Vitals 监控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
```

---

## 🟡 中优先级（影响开发体验/可维护性）

### 6. Transform 组件改进

**当前问题：**
1. 代码重复（9 个几乎相同的输入框）
2. 缺少输入验证
3. 没有实时预览
4. 缺少重置按钮

**改进方案：**

```vue
<!-- 提取 Vector3Input 为独立组件 -->
<template>
  <el-card class="transform-editor">
    <template #header>
      <div class="header">
        <b>{{ t('ui.transformTitle') }}</b>
        <el-button size="small" @click="handleReset">
          {{ t('ui.reset') }}
        </el-button>
      </div>
    </template>

    <el-form :model="localData" :rules="rules">
      <Vector3Input
        v-model="localData.scale"
        :label="t('ui.scale')"
        :min="0.01"
        :max="100"
        :step="0.1"
      />
      <Vector3Input
        v-model="localData.rotate"
        :label="t('ui.rotation')"
        :min="-360"
        :max="360"
      />
      <Vector3Input
        v-model="localData.position"
        :label="t('ui.position')"
      />
    </el-form>

    <el-button type="primary" @click="handleSave">
      {{ t('ui.saveData') }}
    </el-button>
  </el-card>
</template>
```

---

### 7. 状态管理优化

**明确 Store 使用场景：**

```typescript
// ✅ 适合用 Store
- 全局用户信息（user.ts）
- 权限数据（permission.ts）
- 主题设置（settings.ts）

// ✅ 适合用 Composables
- 表单状态
- 组件内部状态
- 临时 UI 状态
```

**优化 Store 结构：**
```typescript
// 使用 Composition API 风格
export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null);
  const isLoggedIn = computed(() => !!userInfo.value);

  async function login(credentials: LoginForm) {
    // ...
  }

  return { userInfo, isLoggedIn, login };
}, {
  persist: {
    paths: ['userInfo'] // 只持久化必要字段
  }
});
```

---

### 8. API 层改进

**问题：**
- API 文件过大（verse.ts 200+ 行）
- 缺少统一错误处理

**改进方案：**

**拆分 API 模块：**
```
src/api/v1/verse/
├── index.ts          # 导出所有 API
├── verse-crud.ts     # CRUD 操作
├── verse-export.ts   # 导出功能
├── verse-import.ts   # 导入功能
└── types.ts          # 类型定义
```

**统一错误处理：**
```typescript
// src/utils/api-error-handler.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number
  ) {
    super(message);
  }
}
```

---

### 9. 路由管理优化

**路由元信息标准化：**
```typescript
// src/router/types.ts
export interface RouteMeta {
  title: string;           // 页面标题
  icon?: string;           // 菜单图标
  hidden?: boolean;        // 是否隐藏
  requiresAuth?: boolean;  // 是否需要登录
  permissions?: string[];  // 所需权限
  keepAlive?: boolean;     // 是否缓存
}
```

---

### 10. 国际化改进

**统一翻译文件结构：**
```
src/lang/
├── zh-CN/
│   ├── common.ts      # 通用文本
│   ├── components.ts  # 组件文本
│   ├── views/
│   │   ├── verse.ts   # 场景编辑器
│   │   └── meta.ts    # 实体管理
│   └── index.ts
```

**添加翻译检查工具：**
```bash
# scripts/check-i18n.ts
# 检查缺失的翻译 key
# 检查未使用的翻译 key
```

---

## 🟢 低优先级（优化体验）

### 11. 文档完善

**需要补充：**
1. API 文档 - 后端接口调用说明
2. 组件文档 - Storybook 完善
3. 部署文档 - 多域名部署流程
4. 开发规范 - 代码风格、提交规范
5. 故障排查 - 常见问题解决

---

### 12. 开发工具优化

**VSCode 配置：**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**推荐插件：**
- Vue.volar
- dbaeumer.vscode-eslint
- esbenp.prettier-vscode
- lokalise.i18n-ally

---

### 13. CI/CD 优化

**建议添加：**
1. GitHub Actions / GitLab CI
   - 自动运行测试
   - 自动类型检查
   - 自动构建预览

2. 代码质量检查
   - SonarQube 集成
   - 代码覆盖率报告
   - 依赖安全扫描

---

### 14. 监控和日志

**建议添加：**
1. 错误监控 - Sentry
2. 性能监控 - Web Vitals
3. 用户行为分析
4. API 调用监控

---

## 📋 改进优先级路线图（2026-02-27 更新）

### 第一阶段 ✅ 已完成
- [x] 修复 TypeScript any 类型（601 → 0，完全清零）
- [x] 清理 console.log（143 → 6，基本完成）
- [x] 添加核心模块单元测试（5 → 57 个测试文件）
- [x] 优化依赖（移除 animate.css、vue-iframes 等）
- [x] Bundle 体积优化（主 chunk 1794KB → 1332KB）

### 第二阶段（当前阶段）
- [ ] 完善测试覆盖率（目标 70%+，当前覆盖率待统计）
- [ ] CSS 主题文件拆分（`theme-styles.scss` 9648 行）
- [ ] Element Plus 按需加载样式（移除全量 CSS 导入）
- [ ] 大文件拆分（ScenePlayer.vue 2053行、script.vue 1736行 等）

### 第三阶段（下一步）
- [ ] 建立 CI/CD 流程（GitHub Actions）
- [ ] 添加错误监控（Sentry）
- [ ] 添加性能监控（Web Vitals）
- [ ] 完善 API 层结构拆分

---

## 🛠️ 快速开始改进

### 立即可做（< 1 小时）

```bash
# 1. 清理控制台日志
pnpm run replace-console

# 2. 修复 ESLint 警告
pnpm run lint:eslint

# 3. 运行依赖检查
npx depcheck

# 4. 类型检查
pnpm run type-check
```

---

## 📊 改进效果（2026-02-27 实际数据）

| 改进项 | 初始状态 | 当前状态 | 达成情况 |
|--------|---------|---------|---------|
| TypeScript any 警告 | 601 个 | **0 个** | ✅ 完全清零 |
| 测试文件数量 | 5 个 | **57 个** | ✅ 增长 11 倍 |
| console.log 残留 | 143 处 | **6 处** | ✅ 减少 96% |
| 主 chunk 大小 | 1794 KB | **1332 KB** | ✅ 减少 26% |
| 主 CSS 大小 | 905 KB | **577 KB** | ✅ 减少 36% |
| 项目版本 | 2.11.3 | **2.11.5** | - |

---

## 💡 总结（2026-02-27）

**已完成的关键改进：**
1. ✅ TypeScript 类型安全：601 → 0 any 警告（100% 消除）
2. ✅ 测试覆盖：5 → 57 个测试文件（API/Store/Utils/Composables 全覆盖）
3. ✅ 性能优化：Bundle 体积减少 26%，CSS 减少 36%

**当前需要继续的工作：**
- 🔴 CSS 主题文件拆分（`theme-styles.scss` 9648 行是最大性能瓶颈）
- 🟡 Element Plus 全量 CSS 导入（`src/main.ts` 第 84 行）
- 🟡 大文件重构（ScenePlayer.vue 等 6 个超长文件）
- 🟢 CI/CD 和监控体系建设

**下一步优先推荐：**
1. 统计并公示实际测试覆盖率数字（`pnpm run test:coverage`）
2. 拆分 `theme-styles.scss` 为路由级别按需加载
3. 建立 GitHub Actions CI 流程
