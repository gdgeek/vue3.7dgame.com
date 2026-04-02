#!/bin/sh
set -e

# ============================================================
# docker-entrypoint.sh
# 动态生成 Nginx API failover 配置
#
# 环境变量格式：
#   APP_API_1_URL=https://api.xrteeth.com
#   APP_API_2_URL=https://api.tmrpp.com
#   APP_DOMAIN_1_URL=https://domain.xrteeth.com
#   APP_DOMAIN_2_URL=https://domain.tmrpp.com
#   APP_DOC_API_URL=https://hololens2.cn/wp-json/wp/v2
#
# 生成链式 failover：
#   /api/        → APP_API_1    → @api_backup_2    → ...
#   /api-domain/ → APP_DOMAIN_1 → @domain_backup_2 → ...
# ============================================================

TEMPLATE="/etc/nginx/templates/default.conf.template"
OUTPUT="/etc/nginx/conf.d/default.conf"

# ============================================================
# generate_failover_chain
#   通用函数：为指定前缀生成链式 failover location 块
#
# 参数：
#   $1 = ENV_PREFIX  环境变量前缀（如 APP_API 或 APP_DOMAIN）
#   $2 = LOC_PATH    location 路径（如 /api/ 或 /api-domain/）
#   $3 = BACKUP_NAME 备用 location 名称前缀（如 api_backup 或 domain_backup）
#   $4 = WITH_GEEK   是否包含 GEEK 自定义头和 WebSocket（yes/no）
# ============================================================
generate_failover_chain() {
  ENV_PREFIX="$1"
  LOC_PATH="$2"
  BACKUP_NAME="$3"
  WITH_GEEK="$4"

  # 统计后端数量
  TOTAL=0
  i=1
  while true; do
    eval "url=\$${ENV_PREFIX}_${i}_URL"
    if [ -z "$url" ]; then
      break
    fi
    TOTAL=$((TOTAL + 1))
    i=$((i + 1))
  done

  if [ "$TOTAL" -eq 0 ]; then
    echo "[entrypoint] WARNING: No ${ENV_PREFIX}_N_URL configured, skipping ${LOC_PATH} failover"
    return
  fi

  echo "[entrypoint] Found $TOTAL ${LOC_PATH} backend(s)"

  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "url=\$${ENV_PREFIX}_${i}_URL"
    eval "host=\$${ENV_PREFIX}_${i}_HOST"

    # 自动从 URL 提取 Host
    if [ -z "$host" ]; then
      host=$(echo "$url" | sed 's|https\?://||' | sed 's|/.*||' | sed 's|:.*||')
    fi

    echo "[entrypoint]   Backend $i: $url (Host: $host)"

    NEXT_IDX=$((i + 1))

    # GEEK 头和 WebSocket 块（仅 API 需要）
    GEEK_BLOCK=""
    if [ "$WITH_GEEK" = "yes" ]; then
      GEEK_BLOCK="
        # GEEK 自定义请求头
        proxy_set_header X-GEEK-Proxy \"true\";
        proxy_set_header X-GEEK-Real-IP \$remote_addr;
        proxy_set_header X-GEEK-Source \"nginx\";

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";

        # 请求体大小
        client_max_body_size 50m;"
    fi

    if [ "$i" -eq 1 ]; then
      # ---- 主 location ----
      BLOCK="
    # ============ 反向代理 - ${LOC_PATH} (Backend $i) ============
    location ${LOC_PATH} {
        proxy_pass ${url}/;

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host ${host};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
${GEEK_BLOCK}
        # 超时配置（快速失败以便切备用）
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;"

      if [ "$TOTAL" -gt 1 ]; then
        BLOCK="${BLOCK}

        # Failover 到备用
        proxy_intercept_errors on;
        error_page 502 503 504 = @${BACKUP_NAME}_${NEXT_IDX};"
      fi

      BLOCK="${BLOCK}
    }"

    else
      # ---- 备用 location @backup_N ----
      BLOCK="
    # ============ 反向代理 - ${LOC_PATH} 备用 (Backend $i) ============
    location @${BACKUP_NAME}_${i} {
        rewrite ^${LOC_PATH}(.*)\$ /\$1 break;
        proxy_pass ${url};

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host ${host};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
${GEEK_BLOCK}
        # 超时配置
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;"

      if [ "$NEXT_IDX" -le "$TOTAL" ]; then
        BLOCK="${BLOCK}

        # Failover 到下一个备用
        proxy_intercept_errors on;
        error_page 502 503 504 = @${BACKUP_NAME}_${NEXT_IDX};"
      fi

      BLOCK="${BLOCK}
    }"
    fi

    CHAIN_RESULT="${CHAIN_RESULT}${BLOCK}"
    i=$((i + 1))
  done
}

# --- 1. 生成 API failover 链 ---
CHAIN_RESULT=""
generate_failover_chain "APP_API" "/api/" "api_backup" "yes"
API_LOCATIONS="$CHAIN_RESULT"

# --- 2. 生成域名信息 API failover 链 ---
CHAIN_RESULT=""
generate_failover_chain "APP_DOMAIN" "/api-domain/" "domain_backup" "no"
DOMAIN_LOCATIONS="$CHAIN_RESULT"

# --- 3. 用 envsubst 处理其他 APP_ 变量（文档 API 等）---
# 排除编号变量（APP_API_N_* 和 APP_DOMAIN_N_*），只替换其余 APP_ 变量
VARS=$(env | grep '^APP_' | grep -v '^APP_API_[0-9]' | grep -v '^APP_DOMAIN_[0-9]' | sed 's/=.*//' | sed 's/^/\$/' | tr '\n' ' ')
if [ -n "$VARS" ]; then
  envsubst "$VARS" < "$TEMPLATE" > "$OUTPUT"
else
  cp "$TEMPLATE" "$OUTPUT"
fi

# --- 4. 注入动态生成的 location 块 ---
inject_locations() {
  PLACEHOLDER="$1"
  CONTENT="$2"
  if [ -n "$CONTENT" ]; then
    LOC_FILE=$(mktemp)
    printf '%s' "$CONTENT" > "$LOC_FILE"
    awk -v file="$LOC_FILE" -v marker="$PLACEHOLDER" '
      $0 ~ marker {
        while ((getline line < file) > 0) print line
        close(file)
        next
      }
      { print }
    ' "$OUTPUT" > "${OUTPUT}.tmp"
    mv "${OUTPUT}.tmp" "$OUTPUT"
    rm -f "$LOC_FILE"
  fi
}

inject_locations "# __API_LOCATIONS__" "$API_LOCATIONS"
inject_locations "# __DOMAIN_LOCATIONS__" "$DOMAIN_LOCATIONS"

echo "[entrypoint] Nginx config generated at $OUTPUT"

# --- 5. 替换 plugins.json 中的插件 URL 占位符 ---
PLUGINS_FILE="/usr/share/nginx/html/config/plugins.json"
if [ -f "$PLUGINS_FILE" ]; then
  echo "[entrypoint] Substituting plugin URLs in $PLUGINS_FILE"
  echo "[entrypoint]   PLUGIN_USER_MANAGEMENT_URL=${PLUGIN_USER_MANAGEMENT_URL:-<not set>}"
  echo "[entrypoint]   PLUGIN_SYSTEM_ADMIN_URL=${PLUGIN_SYSTEM_ADMIN_URL:-<not set>}"
  echo "[entrypoint]   PLUGIN_APK_REBUILDER_URL=${PLUGIN_APK_REBUILDER_URL:-<not set>}"
  envsubst '$PLUGIN_USER_MANAGEMENT_URL $PLUGIN_SYSTEM_ADMIN_URL $PLUGIN_APK_REBUILDER_URL' \
    < "$PLUGINS_FILE" > "${PLUGINS_FILE}.tmp" && mv "${PLUGINS_FILE}.tmp" "$PLUGINS_FILE"
fi

# --- 6. 生成运行时环境变量注入文件 ---
ENV_JS="/usr/share/nginx/html/__env.js"
echo "[entrypoint] Generating runtime env injection at $ENV_JS"
cat > "$ENV_JS" <<EOF
window.__ENV__ = {
  BLOCKLY_URL: "${APP_BLOCKLY_URL:-}",
  EDITOR_URL: "${APP_EDITOR_URL:-}"
};
EOF
echo "[entrypoint] Runtime env: BLOCKLY_URL=${APP_BLOCKLY_URL:-<not set>}, EDITOR_URL=${APP_EDITOR_URL:-<not set>}"

# --- 6. 启动 nginx ---
exec nginx -g 'daemon off;'
