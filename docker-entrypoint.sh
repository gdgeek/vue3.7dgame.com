#!/bin/sh
set -e

# ============================================================
# docker-entrypoint.sh
# 动态生成 Nginx API failover 配置
#
# 环境变量格式：
#   APP_API_1_URL=https://api.xrteeth.com
#   APP_API_1_HOST=api.xrteeth.com   (可选，自动从 URL 提取)
#   APP_API_2_URL=https://api.tmrpp.com
#   APP_API_3_URL=https://api.backup3.com
#   ...
#
# 生成链式 failover：
#   /api/ → APP_API_1 → @api_backup_2 → @api_backup_3 → (兜底)
# ============================================================

TEMPLATE="/etc/nginx/templates/default.conf.template"
OUTPUT="/etc/nginx/conf.d/default.conf"

# --- 1. 统计后端数量 ---
TOTAL=0
i=1
while true; do
  eval "url=\$APP_API_${i}_URL"
  if [ -z "$url" ]; then
    break
  fi
  TOTAL=$((TOTAL + 1))
  i=$((i + 1))
done

if [ "$TOTAL" -eq 0 ]; then
  echo "[entrypoint] WARNING: No APP_API_N_URL configured, skipping API failover generation"
  LOCATIONS=""
else
  echo "[entrypoint] Found $TOTAL API backend(s)"

  # --- 2. 生成 location 块 ---
  LOCATIONS=""
  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "url=\$APP_API_${i}_URL"
    eval "host=\$APP_API_${i}_HOST"

    # 自动从 URL 提取 Host（如果未配置）
    if [ -z "$host" ]; then
      host=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||' | sed 's|:.*||')
    fi

    echo "[entrypoint]   Backend $i: $url (Host: $host)"

    NEXT_IDX=$((i + 1))

    if [ "$i" -eq 1 ]; then
      # ---- 主 location /api/ ----
      BLOCK="
    # ============ 反向代理 - 主 API (Backend $i) ============
    location /api/ {
        proxy_pass ${url}/;

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host ${host};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # GEEK 自定义请求头
        proxy_set_header X-GEEK-Proxy \"true\";
        proxy_set_header X-GEEK-Real-IP \$remote_addr;
        proxy_set_header X-GEEK-Source \"nginx\";

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";

        # 超时配置（主 API 快速失败以便切备用）
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # 请求体大小
        client_max_body_size 50m;"

      # 如果有备用，添加 error_page failover
      if [ "$TOTAL" -gt 1 ]; then
        BLOCK="${BLOCK}

        # Failover 到备用 API
        proxy_intercept_errors on;
        error_page 502 503 504 = @api_backup_${NEXT_IDX};"
      fi

      BLOCK="${BLOCK}
    }"

    else
      # ---- 备用 location @api_backup_N ----
      BLOCK="
    # ============ 反向代理 - 备用 API (Backend $i) ============
    location @api_backup_${i} {
        # 剥离 /api/ 前缀后转发（命名 location 无法用尾部斜杠剥离）
        rewrite ^/api/(.*)\$ /\$1 break;
        proxy_pass ${url};

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host ${host};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # GEEK 自定义请求头
        proxy_set_header X-GEEK-Proxy \"true\";
        proxy_set_header X-GEEK-Real-IP \$remote_addr;
        proxy_set_header X-GEEK-Source \"nginx\";

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";

        # 超时配置
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # 请求体大小
        client_max_body_size 50m;"

      # 如果还有下一个备用，继续链式 failover
      if [ "$NEXT_IDX" -le "$TOTAL" ]; then
        BLOCK="${BLOCK}

        # Failover 到下一个备用 API
        proxy_intercept_errors on;
        error_page 502 503 504 = @api_backup_${NEXT_IDX};"
      fi

      BLOCK="${BLOCK}
    }"
    fi

    LOCATIONS="${LOCATIONS}${BLOCK}"
    i=$((i + 1))
  done
fi

# --- 3. 先用 envsubst 处理其他 APP_ 变量（域名信息、文档等）---
# 只替换 APP_ 开头的变量，不影响 nginx 内置变量
VARS=$(env | grep '^APP_' | grep -v '^APP_API_[0-9]' | sed 's/=.*//' | sed 's/^/\$/' | tr '\n' ' ')
if [ -n "$VARS" ]; then
  envsubst "$VARS" < "$TEMPLATE" > "$OUTPUT"
else
  cp "$TEMPLATE" "$OUTPUT"
fi

# --- 4. 注入动态生成的 API location 块 ---
if [ -n "$LOCATIONS" ]; then
  # 使用 awk 替换占位符（sed 处理多行替换不可靠）
  ESCAPED_LOCATIONS=$(printf '%s' "$LOCATIONS" | sed 's/[&/\]/\\&/g')
  # 写入临时文件再替换
  LOCATIONS_FILE=$(mktemp)
  printf '%s' "$LOCATIONS" > "$LOCATIONS_FILE"
  awk -v file="$LOCATIONS_FILE" '
    /# __API_LOCATIONS__/ {
      while ((getline line < file) > 0) print line
      close(file)
      next
    }
    { print }
  ' "$OUTPUT" > "${OUTPUT}.tmp"
  mv "${OUTPUT}.tmp" "$OUTPUT"
  rm -f "$LOCATIONS_FILE"
fi

echo "[entrypoint] Nginx config generated at $OUTPUT"

# --- 5. 启动 nginx ---
exec nginx -g 'daemon off;'
