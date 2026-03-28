# 需求文档：网站管理插件

## 简介

本文档定义了"网站管理插件"（website-management-plugin）的需求。该插件作为现有插件系统的一个新插件实例，参照用户管理插件（user-management）的模式，提供网站（域名/站点）的权限管理功能。插件通过 iframe 嵌入主框架，通过 PostMessage 通信，通过后端 API 实现权限控制。本阶段聚焦于权限管理部分。

## 术语表

- **Website_Management_Plugin**: 网站管理插件，用于管理网站/站点的权限配置
- **Main_Framework**: 主应用框架（Vue 3），提供插件运行环境和侧边栏导航
- **Plugin_System**: 已有的插件化架构系统，负责插件的注册、加载和生命周期管理
- **Permission_API**: 后端权限接口，用于查询和管理插件的允许操作列表
- **Plugin_Config**: 插件配置，定义在 `public/config/plugins.json` 中的插件元数据
- **Allowed_Actions**: 允许操作列表，后端返回的当前用户对该插件可执行的操作集合
- **Plugin_Manifest**: 插件清单，描述插件的 id、名称、URL、分组等元数据
- **Sidebar**: 主框架左侧导航栏，展示插件菜单入口
- **Token**: JWT 身份认证令牌，通过 INIT 消息注入插件

## 需求

### 需求 1：插件注册配置

**用户故事：** 作为系统管理员，我希望将网站管理插件注册到插件系统中，以便用户可以通过侧边栏访问该功能。

#### 验收标准

1. THE Plugin_Config SHALL include a plugin entry with id "website-management" in the plugins array of `plugins.json`
2. THE Plugin_Manifest for "website-management" SHALL contain all required fields: id, name, nameI18n, description, url, icon, group, enabled, order, allowedOrigin, and version
3. THE Plugin_Manifest SHALL set the group field to "tools" to appear under the existing "实用工具" menu group
4. THE Plugin_Manifest SHALL include nameI18n translations for zh-CN, zh-TW, en-US, ja-JP, and th-TH locales
5. WHEN the Plugin_System loads the configuration, THE Plugin_System SHALL register "website-management" alongside existing plugins without affecting their behavior

### 需求 2：后端权限接口

**用户故事：** 作为系统管理员，我希望后端提供网站管理插件的权限查询接口，以便根据用户角色控制插件的可见性和可用操作。

#### 验收标准

1. WHEN the Main_Framework requests allowed actions for plugin_name "website-management", THE Permission_API SHALL return the Allowed_Actions list for the current user
2. THE Permission_API SHALL use the existing endpoint pattern `GET /v1/plugin/allowed-actions?plugin_name=website-management`
3. WHEN the user has admin or root role, THE Permission_API SHALL return a non-empty Allowed_Actions list containing at least "view" and "manage" actions
4. WHEN the user has no permission for website management, THE Permission_API SHALL return an empty Allowed_Actions list
5. IF the Permission_API request fails, THEN THE Main_Framework SHALL hide the "website-management" plugin from the Sidebar
6. WHEN the Permission_API returns an empty Allowed_Actions list, THE Main_Framework SHALL hide the "website-management" plugin from the Sidebar

### 需求 3：前端 API 模块

**用户故事：** 作为前端开发者，我希望有一个专用的 API 模块来调用网站管理相关的后端接口，以便在插件和主框架中复用。

#### 验收标准

1. THE Main_Framework SHALL provide an API module at `src/api/plugins/website-management.ts` for website management related requests
2. THE API module SHALL export a function to query the permission status of the website-management plugin
3. THE API module SHALL use the existing `request` utility from `src/utils/request.ts` for HTTP calls
4. THE API module SHALL follow the existing API pattern established in `src/api/plugins/index.ts` with `/api/v1/` prefix
5. WHEN the API module sends a request, THE API module SHALL include the user Token in the Authorization header automatically via the request utility

### 需求 4：插件权限集成

**用户故事：** 作为用户，我希望只有拥有相应权限的用户才能看到和使用网站管理插件，以便保证系统安全。

#### 验收标准

1. WHEN the Plugin_System store initializes, THE store SHALL call the Permission_API for "website-management" to fetch Allowed_Actions
2. WHEN the Allowed_Actions for "website-management" is non-empty, THE Sidebar SHALL display the "website-management" entry under the "实用工具" group
3. WHEN the Allowed_Actions for "website-management" is empty, THE Sidebar SHALL hide the "website-management" entry
4. THE Plugin_System store SHALL cache the Allowed_Actions for "website-management" in the pluginPermissions state
5. WHEN the user logs out and logs back in, THE Plugin_System store SHALL re-fetch the Allowed_Actions for "website-management"

### 需求 5：侧边栏菜单展示

**用户故事：** 作为用户，我希望在侧边栏的"实用工具"分组下看到网站管理插件入口，以便快速访问该功能。

#### 验收标准

1. WHEN the user has permission for "website-management", THE Sidebar SHALL display a menu item with the localized name under the "实用工具" group
2. WHEN the user clicks the "website-management" menu item, THE Main_Framework SHALL navigate to `/plugins/website-management`
3. THE Sidebar SHALL display the "website-management" menu item with the icon specified in the Plugin_Manifest
4. THE Sidebar SHALL sort the "website-management" menu item according to its order field relative to other plugins in the same group
5. WHILE the sidebar is in collapsed mode, THE Sidebar SHALL show the "website-management" entry in the popover menu with its localized name

### 需求 6：插件加载与初始化

**用户故事：** 作为用户，我希望点击网站管理插件后能正确加载插件界面，以便使用网站管理功能。

#### 验收标准

1. WHEN the user navigates to `/plugins/website-management`, THE Plugin_System SHALL create an iframe with the URL specified in the Plugin_Manifest
2. WHEN the iframe loads successfully, THE Plugin_System SHALL wait for the PLUGIN_READY message from the plugin
3. WHEN the PLUGIN_READY message is received, THE Plugin_System SHALL send an INIT message containing the user Token and extraConfig
4. IF the iframe fails to load within 30 seconds, THEN THE Plugin_System SHALL display an error message with a retry button
5. WHEN the user navigates away from the plugin page, THE Plugin_System SHALL send a DESTROY message and remove the iframe
6. THE Plugin_System SHALL display a loading indicator while the plugin iframe is loading

### 需求 7：权限操作定义

**用户故事：** 作为系统架构师，我希望为网站管理插件定义明确的权限操作类型，以便实现细粒度的访问控制。

#### 验收标准

1. THE Permission_API SHALL support the following Allowed_Actions for "website-management": "view", "create", "edit", "delete", and "manage"
2. WHEN the user has "view" action, THE Website_Management_Plugin SHALL allow the user to browse website list
3. WHEN the user has "manage" action, THE Website_Management_Plugin SHALL allow the user to modify website permissions and settings
4. THE Permission_API SHALL return only the actions that the current user is authorized to perform
5. WHEN the Allowed_Actions change due to role update, THE Plugin_System store SHALL reflect the updated actions after re-initialization

### 需求 8：错误处理与降级

**用户故事：** 作为用户，我希望在权限接口不可用时系统能优雅降级，以便不影响其他功能的使用。

#### 验收标准

1. IF the Permission_API returns HTTP 404, THEN THE Plugin_System store SHALL treat all plugins as permitted (fallback to open mode)
2. IF the Permission_API returns a non-zero error code, THEN THE Plugin_System store SHALL treat the "website-management" plugin as not permitted
3. WHEN a network error occurs during Permission_API call, THE Plugin_System store SHALL keep the "website-management" plugin hidden
4. THE Main_Framework SHALL continue normal operation when the "website-management" plugin permission check fails
5. IF the plugin iframe encounters a runtime error, THEN THE Plugin_System SHALL display an error state with a retry option without affecting other plugins
