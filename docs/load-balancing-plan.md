# Nginx 反向代理负载均衡改造方案

## TL;DR

将主前端 Nginx 现有的链式 failover（只走主后端，挂了才切备用）改造为 **`split_clients` 加权负载均衡 + `resolver` 动态 DNS + `error_page` 故障切换**，支持弹性 IP 的多后端服务器集群。改动范围仅 `docker-entrypoint.sh` + `nginx.conf.template`，前端代码零改动，环境变量向后兼容。

## 背景与约束

| 条件 | 状态 |
|------|------|
| 多台后端服务器 | ✓ 弹性伸缩，数量可变 |
| 数据库 | ✓ 所有后端共享同一个 |
| 域名 | ✓ 每台后端有独立固定域名（如 `api.xrteeth.com`、`api.tmrpp.com`） |
| IP | ✗ 弹性分配，不固定 |
| JWT 认证 | ✓ 无状态，不需要 session sticky |
| 技术栈 | Nginx 开源版（nginx:alpine Docker 镜像） |
| 需要覆盖的代理 | `/api/`（主业务）、`/api-domain/`（域名信息） |
| `/api-doc/` | 单后端，不参与负载均衡 |

## 当前架构（改造前）

- `docker-entrypoint.sh` 中 `generate_failover_chain()` 函数
- 生成链式 failover：`location /api/` → 主后端 → `@api_backup_2` → `@api_backup_3` → ...
- `proxy_pass` 直接写 URL（Nginx 启动时解析一次 DNS，之后不再更新）
- 100% 流量走主后端，仅 502/503/504 时切备用
- 环境变量格式：`APP_API_N_URL`、`APP_API_N_HOST`（可选）

## 改造后架构

```
用户浏览器
    ↓
前端 Nginx
    ↓ split_clients 按权重分流
    ├─ 60%  →  api.xrteeth.com   (resolver 动态解析)
    ├─ 30%  →  api.tmrpp.com     (resolver 动态解析)
    └─ 10%  →  api.third.com     (resolver 动态解析)
    │
    └─ 任何一个 502/503/504 → failover 到环形下一个后端
```

关键技术：
1. `resolver 8.8.8.8 223.5.5.5 valid=30s` — DNS 每 30s 刷新，适配弹性 IP
2. `split_clients "$request_id"` — 按请求 ID 哈希分流，实现加权负载均衡
3. `map` — 根据分流结果动态选择 URL、Host 头
4. 变量化 `proxy_pass` — 使用 `$var` 触发每次请求都走 resolver
5. `error_page 502 503 504 = @failover` — 故障自动切换到环形下一个后端

## 环境变量配置

### 新增环境变量

| 变量名 | 必选 | 默认值 | 说明 |
|--------|------|--------|------|
| `APP_API_N_WEIGHT` | 否 | 平均分配 | 第 N 个 API 后端的流量权重 |
| `APP_DOMAIN_N_WEIGHT` | 否 | 平均分配 | 第 N 个域名信息 API 后端的流量权重 |
| `APP_RESOLVER` | 否 | `8.8.8.8 223.5.5.5` | DNS 解析服务器地址 |

### docker-compose.prod.yml 示例

```yaml
environment:
  # API 后端（编号格式，支持负载均衡）
  - APP_API_1_URL=https://api.xrteeth.com
  - APP_API_1_WEIGHT=60
  - APP_API_2_URL=https://api.tmrpp.com
  - APP_API_2_WEIGHT=30
  - APP_API_3_URL=https://api.third.com
  - APP_API_3_WEIGHT=10
  # 域名信息 API
  - APP_DOMAIN_1_URL=https://domain.xrteeth.com
  - APP_DOMAIN_2_URL=https://domain.tmrpp.com
  # DNS 解析服务器（可选）
  - APP_RESOLVER=8.8.8.8 223.5.5.5
```

## 生成的 Nginx 配置示例

### 多后端（≥2 个）

```nginx
# DNS 动态解析
resolver 8.8.8.8 223.5.5.5 valid=30s ipv6=off;
resolver_timeout 5s;

# 加权分流（按 request_id 哈希）
split_clients "$request_id" $api_pool {
    60.0%  1;
    30.0%  2;
    *      3;
}

# 分流结果 → 后端 URL
map $api_pool $api_backend_url {
    1  "https://api.xrteeth.com";
    2  "https://api.tmrpp.com";
    3  "https://api.third.com";
}

# 分流结果 → Host 头
map $api_pool $api_backend_host {
    1  "api.xrteeth.com";
    2  "api.tmrpp.com";
    3  "api.third.com";
}

# Failover 映射（环形：N → (N%TOTAL)+1）
map $api_pool $api_fb_url {
    1  "https://api.tmrpp.com";
    2  "https://api.third.com";
    3  "https://api.xrteeth.com";
}
map $api_pool $api_fb_host {
    1  "api.tmrpp.com";
    2  "api.third.com";
    3  "api.xrteeth.com";
}

server {
    # ...

    location /api/ {
        proxy_pass $api_backend_url/;
        proxy_ssl_server_name on;
        proxy_set_header Host $api_backend_host;
        # ... 其他 header ...

        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;

        proxy_intercept_errors on;
        error_page 502 503 504 = @api_failover;
    }

    location @api_failover {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass $api_fb_url;
        proxy_ssl_server_name on;
        proxy_set_header Host $api_fb_host;
        # ... 其他 header ...

        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
    }
}
```

### 单后端（退化模式）

```nginx
resolver 8.8.8.8 223.5.5.5 valid=30s ipv6=off;
resolver_timeout 5s;

server {
    # ...

    location /api/ {
        set $api_single_backend "https://api.xrteeth.com";
        proxy_pass $api_single_backend/;
        proxy_ssl_server_name on;
        proxy_set_header Host api.xrteeth.com;
        # ... 其他 header ...
    }
}
```

## 请求流转图

```
请求到达 /api/v1/users
         │
         ▼
   split_clients 计算哈希
   $request_id → 决定 $api_pool = 2
         │
         ▼
   map 查表:
   $api_backend_url = "https://api.tmrpp.com"
   $api_backend_host = "api.tmrpp.com"
         │
         ▼
   resolver 解析 api.tmrpp.com
   → 得到当前 IP（弹性，随时可能变）
         │
         ▼
   proxy_pass → 后端响应
         │
    ┌────┴────┐
    │ 成功200 │ 失败 502/503/504
    │  返回   │      │
    └─────────┘      ▼
              @api_failover
              map 查表: fb_url = "https://api.third.com"
              resolver 解析 → 当前 IP
              proxy_pass 重试
                   │
              ┌────┴────┐
              │  返回    │ 也失败 → 502 给客户端
              └─────────┘
```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `web/docker-entrypoint.sh` | **重写** | `generate_failover_chain()` → `generate_lb_config()` |
| `web/nginx.conf.template` | **修改** | `server {}` 前添加 `# __RESOLVER__` 和 `# __LB_HTTP_BLOCK__` 占位符 |
| `web/docker-compose.prod.yml` | **修改** | 添加 `WEIGHT`、`RESOLVER` 环境变量 |
| `web/docker-compose.test.yml` | **修改** | 对齐新格式 |
| `web/Dockerfile` | 无需改动 | entrypoint 和 template 路径不变 |
| `web/src/**` | 无需改动 | 前端代码零改动 |

## 向后兼容

| 配置方式 | 行为 |
|----------|------|
| 只配 1 个 `APP_API_1_URL` | 退化为简单反向代理 + DNS 动态解析，无分流 |
| 配 2 个，不配 WEIGHT | 50/50 平均分流 + failover |
| 配 3 个 + WEIGHT | 按权重分流 + 环形 failover |
| 只配 URL 不配 HOST | 自动从 URL 提取域名（现有行为不变） |

## 验证清单

1. **配置生成验证**：用 1/2/3 个后端启动 Docker，检查生成的 Nginx 配置
2. **Nginx 语法检查**：`docker exec <container> nginx -t`
3. **负载均衡验证**：多次 `curl` 确认流量分配到不同后端
4. **Failover 验证**：停掉一个后端，确认请求自动切换
5. **DNS 动态解析验证**：改 DNS 指向，30s 后确认生效
6. **单后端退化验证**：只配 1 个 URL，确认无 split_clients
7. **entrypoint 日志**：检查后端列表、权重、分流比例打印

## 设计决策

- **`split_clients` 而非 `upstream`**：Nginx 开源版变量化 `proxy_pass` 无法使用 upstream 块，`split_clients` 是唯一不需要 OpenResty 的方案
- **Failover 只重试 1 次**：`error_page` 内部重定向限制，1 次重试覆盖单节点故障已足够
- **环形 Failover**：后端 N → (N%TOTAL)+1，避免所有流量都 failover 到同一个备用
- **`resolver valid=30s`**：弹性 IP 的合理平衡点
- **不改前端代码**：所有改动限制在 Nginx 配置层

## 后续扩展

1. **主动健康检查**：需换 OpenResty 或 Nginx Plus，建议先观察被动方案效果
2. **后端 `/health` 端点**：建议在 Yii2 添加 `/v1/health` 接口用于运维监控
3. **DNS 服务选择**：云内网建议用云厂商 DNS（如阿里云 `100.100.2.136`）
