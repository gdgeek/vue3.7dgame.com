---
inclusion: fileMatch
fileMatchPattern: "**/plugin-system/**,**/plugins/**,**/config/plugins.json,**/.env*"
---

# 插件系统架构原则

## 核心边界：低耦合

- 主平台只与插件前端通信（通过 iframe + PostMessage）
- 插件是否有后端、后端地址是什么，主平台不需要知道，也不应该配置
- 插件配置（plugins.json）只包含前端 URL、图标、分组等展示/加载信息
- 不要在 env 或 plugins.json 中为插件配置 API 地址（如 apiBaseUrl）
- extraConfig 仅用于与插件前端展示相关的配置，不用于后端通信地址
