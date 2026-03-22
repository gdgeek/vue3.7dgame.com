# 后端 Host 头统一方案（为未来负载均衡做准备）

## 背景

目前前端 Nginx 对两个后端（`api.xrteeth.com` 和 `api.tmrpp.com`）采用灾备 failover 模式：主后端不可用时自动切换到备用后端。

未来如果需要升级为负载均衡（两个后端平均分配流量），需要后端支持统一的 Host 头。目前两个后端只接受各自域名的 Host 头，用错误的 Host 访问会返回 404。

## 当前问题

```bash
# 正常 — 用自己的域名访问
curl -H "Host: api.xrteeth.com" https://api.xrteeth.com/health    # 200 ✅
curl -H "Host: api.tmrpp.com" https://api.tmrpp.com/health        # 200 ✅

# 异常 — 用对方的域名访问
curl -H "Host: api.xrteeth.com" https://api.tmrpp.com/health      # 404 ❌
curl -H "Host: api.tmrpp.com" https://api.xrteeth.com/health      # 404 ❌
```

Nginx 负载均衡（upstream）只能设置一个统一的 Host 头，无法根据选中的后端动态切换，所以需要两个后端都能接受同一个 Host。

## 需要修改的地方

### 1. 后端容器的 Nginx 配置

两台后端的 Docker 容器里应该都有一个 Nginx 配置文件（通常是 `/etc/nginx/conf.d/default.conf` 或 `/etc/nginx/sites-enabled/` 下的文件）。

找到 `server_name` 那一行，把两个域名都加上：

```nginx
# 修改前（api.tmrpp.com 的配置）
server {
    listen 80;
    server_name api.tmrpp.com;
    # ...
}

# 修改后
server {
    listen 80;
    server_name api.tmrpp.com api.xrteeth.com;
    # ...
}
```

同样，`api.xrteeth.com` 的配置也加上 `api.tmrpp.com`：

```nginx
# 修改后
server {
    listen 80;
    server_name api.xrteeth.com api.tmrpp.com;
    # ...
}
```

> 如果用的是 HTTPS（listen 443），同样修改对应的 server 块。

### 2. Yii 框架配置（如果有 host 校验）

检查 Yii 的配置文件（通常是 `config/web.php` 或 `common/config/main.php`），看是否有以下配置：

```php
// 如果有 hostInfo 写死了域名，改为动态获取
'request' => [
    // 删除或注释掉写死的 hostInfo
    // 'hostInfo' => 'https://api.tmrpp.com',

    // 如果有 trustedHosts，确保前端 Nginx 的 IP 在信任列表中
    'trustedHosts' => [
        '10.0.0.0/8'    => ['X-Forwarded-For', 'X-Forwarded-Host'],
        '172.16.0.0/12' => ['X-Forwarded-For', 'X-Forwarded-Host'],
    ],
],
```

另外检查是否有 CORS 配置限制了允许的 Origin：

```php
// 如果有 CORS 过滤器，确保两个域名都在允许列表中
'corsFilter' => [
    'class' => \yii\filters\Cors::class,
    'cors' => [
        'Origin' => [
            'https://api.xrteeth.com',
            'https://api.tmrpp.com',
            // 前端域名也要加
        ],
    ],
],
```

### 3. SSL 证书（如果后端直接处理 HTTPS）

如果后端容器自己处理 SSL（不是通过前面的负载均衡器/CDN 卸载），需要确保 SSL 证书覆盖两个域名。可以用 SAN（Subject Alternative Name）证书，或者用通配符证书。

## 验证方法

修改完成后，用以下命令验证：

```bash
# 两个后端都应该能接受 api.xrteeth.com 的 Host 头
curl -H "Host: api.xrteeth.com" https://api.xrteeth.com/health    # 应返回 200
curl -H "Host: api.xrteeth.com" https://api.tmrpp.com/health      # 应返回 200（之前是 404）

# 反过来也测一下
curl -H "Host: api.tmrpp.com" https://api.xrteeth.com/health      # 应返回 200
curl -H "Host: api.tmrpp.com" https://api.tmrpp.com/health        # 应返回 200
```

四个请求都返回 200 就说明 Host 头统一成功。

## 统一后前端的变化

后端完成 Host 统一后，前端 Nginx 可以从当前的 failover 模式升级为标准负载均衡：

```nginx
# 升级后的配置（前端 Nginx）
upstream api_pool {
    server api.xrteeth.com:443;
    server api.tmrpp.com:443;
    # 默认 round-robin，请求平均分配
}

location /api/ {
    proxy_pass https://api_pool/;
    proxy_set_header Host api.xrteeth.com;  # 统一用一个 Host
    proxy_ssl_server_name on;
    proxy_ssl_name api.xrteeth.com;
    # ...
}
```

这个前端改动等后端验证通过后再做，不急。

## 优先级

这个改动不紧急。当前的 failover 灾备方案已经在线上运行，主后端挂了会自动切备用。负载均衡是后续优化项，等有需要时再推进。
