# 域名自定义图标 (Domain Icon) 清单

## 模式
所有 logo/icon 图片都应使用 `domainStore.icon` 动态绑定，带静态回退：
```html
<img :src="domainStore.icon || '/默认图片路径'" alt="Logo" />
```

## 已处理的位置

| 文件 | 位置说明 | 回退图片 |
|------|---------|---------|
| `src/layout/components/Sidebar/SidebarLeft.vue` | 左侧布局 sidebar logo | `/icon.png` |
| `src/layout/components/Sidebar/components/SidebarLogo.vue` | MIX/TOP 布局 sidebar logo | `logo.gif` |
| `src/views/web/index.vue` | 公开页导航栏 logo (桌面+移动端) | `logo.gif` |
| `src/components/Account/LoginDialog.vue` | 登录弹窗 logo | `logo.gif` |
| `src/components/Account/Wechat.vue` | 微信二维码中心 logo | `logo.gif` |
| `src/views/site/index.vue` | 站点首页 header logo | `/favicon.ico` |
| `src/views/login/index.vue` | 登录页 logo | `/favicon.ico` |
| `src/views/register/index.vue` | 注册页 logo | `/favicon.ico` |
| `src/store/modules/domain.ts` | favicon 动态替换 (fetchDefaultInfo) | 无回退 |

## 踩坑经验
- 项目有多个 sidebar 组件：`SidebarLogo.vue`(MIX/TOP) 和 `SidebarLeft.vue`(LEFT)，改动态内容时两边都要改
- `Wechat.vue` 默认没有导入 `domainStore`，需要手动添加 import 和实例化
- 新增页面如果有 logo 展示，记得查此清单并使用同样的模式
- `domainStore` 数据来自异步 API，首次访问无 cookie 缓存时 `onMounted` 阶段 `defaultInfo` 可能还是 null。如果逻辑依赖 `homepage`/`icon` 等字段且必须在首次访问生效，需要用 `watch` 监听变化而非仅在 `onMounted` 中读取
