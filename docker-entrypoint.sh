#!/bin/sh
set -e

# ============================================================
# docker-entrypoint.sh
# 动态生成 Nginx 负载均衡 + failover 配置
#
# 环境变量格式：
#   APP_API_1_URL=https://api.xrteeth.com
#   APP_API_1_WEIGHT=60                        （可选，默认平均分配）
#   APP_API_2_URL=https://api.tmrpp.com
#   APP_API_2_WEIGHT=30
#   APP_API_3_URL=https://api.third.com
#   APP_API_3_WEIGHT=10
#   APP_CONFIG_1_URL=https://system-admin.plugins.xrugc.com/backend/api
#   APP_CONFIG_2_URL=https://system-admin-backup.plugins.xrugc.com/backend/api
#   APP_DOMAIN_1_URL=https://domain.xrteeth.com
#   APP_DOMAIN_2_URL=https://domain.tmrpp.com
#   APP_DOC_API_URL=https://hololens2.cn/wp-json/wp/v2
#   APP_RESOLVER=8.8.8.8 223.5.5.5             （可选，DNS 解析服务器）
#
# 生成负载均衡 + failover：
#   split_clients 按权重分流 → map 映射后端 URL/Host
#   /api/        → 加权分流到 APP_API_N → failover 到环形下一个
#   /api-config/ → 加权分流到 APP_CONFIG_N → failover 到环形下一个
#   /api-domain/ → 加权分流到 APP_DOMAIN_N → failover 到环形下一个
# ============================================================

TEMPLATE="/etc/nginx/templates/default.conf.template"
OUTPUT="/etc/nginx/conf.d/default.conf"

# 全局累积变量（http 层级配置：split_clients + map）
LB_HTTP_BLOCK=""

# ============================================================
# generate_lb_config
#   通用函数：为指定前缀生成负载均衡配置
#
# 参数：
#   $1 = ENV_PREFIX   环境变量前缀（如 APP_API 或 APP_CONFIG 或 APP_DOMAIN）
#   $2 = LOC_PATH     location 路径（如 /api/ 或 /api-config/ 或 /api-domain/）
#   $3 = PREFIX_NAME  Nginx 变量名前缀（如 api 或 domain）
#   $4 = WITH_GEEK    是否包含 GEEK 自定义头和 WebSocket（yes/no）
#   $5 = FAILOVER_STATUS_CODES  触发 failover 的状态码（可选，默认 502 503 504）
#
# 输出（通过全局变量）：
#   LB_HTTP_BLOCK  += split_clients + map 块（http 层级）
#   CHAIN_RESULT    = location 块（server 层级）
# ============================================================
generate_lb_config() {
  ENV_PREFIX="$1"
  LOC_PATH="$2"
  PREFIX_NAME="$3"
  WITH_GEEK="$4"
  FAILOVER_STATUS_CODES="${5:-502 503 504}"

  CHAIN_RESULT=""

  # --- 1. 收集后端信息 ---
  TOTAL=0
  i=1
  while true; do
    eval "url=\$${ENV_PREFIX}_${i}_URL"
    if [ -z "$url" ]; then
      break
    fi

    eval "host=\$${ENV_PREFIX}_${i}_HOST"
    eval "weight=\$${ENV_PREFIX}_${i}_WEIGHT"

    # 自动从 URL 提取 Host
    if [ -z "$host" ]; then
      host=$(echo "$url" | sed -E 's|https?://||' | sed 's|/.*||' | sed 's|:.*||')
    fi

    TOTAL=$((TOTAL + 1))
    eval "LB_URL_${TOTAL}=\"${url}\""
    eval "LB_HOST_${TOTAL}=\"${host}\""
    eval "LB_WEIGHT_${TOTAL}=\"${weight}\""
    i=$((i + 1))
  done

  if [ "$TOTAL" -eq 0 ]; then
    echo "[entrypoint] WARNING: No ${ENV_PREFIX}_N_URL configured, skipping ${LOC_PATH}"
    return
  fi

  echo "[entrypoint] ---- ${LOC_PATH} load balancing ----"
  echo "[entrypoint] Found $TOTAL backend(s)"

  # 打印后端列表
  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "u=\$LB_URL_${i}"
    eval "h=\$LB_HOST_${i}"
    eval "w=\$LB_WEIGHT_${i}"
    echo "[entrypoint]   Backend $i: $u (Host: $h, Weight: ${w:-auto})"
    i=$((i + 1))
  done

  # --- GEEK 头和 WebSocket 块 ---
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

  # ==========================================================
  # 单后端：退化为简单反向代理 + resolver 动态解析
  # ==========================================================
  if [ "$TOTAL" -eq 1 ]; then
    eval "url=\$LB_URL_1"
    eval "host=\$LB_HOST_1"

    echo "[entrypoint] Mode: single backend (resolver-enabled)"

    CHAIN_RESULT="
    # ============ 反向代理 - ${LOC_PATH} (单后端 + DNS 动态解析) ============
    location ${LOC_PATH} {
        set \$${PREFIX_NAME}_single_backend \"${url}\";
        rewrite ^${LOC_PATH}(.*)\$ /\$1 break;
        proxy_pass \$${PREFIX_NAME}_single_backend;

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host ${host};
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Original-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
${GEEK_BLOCK}
        # 超时配置
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }"
    return
  fi

  # ==========================================================
  # 多后端：split_clients 加权分流 + map 映射 + failover
  # ==========================================================
  echo "[entrypoint] Mode: load balancing ($TOTAL backends)"

  # --- 2. 计算权重 ---
  TOTAL_WEIGHT=0
  HAS_WEIGHT=0
  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "w=\$LB_WEIGHT_${i}"
    if [ -n "$w" ]; then
      HAS_WEIGHT=1
      TOTAL_WEIGHT=$((TOTAL_WEIGHT + w))
    fi
    i=$((i + 1))
  done

  # 未指定权重时平均分配
  if [ "$HAS_WEIGHT" -eq 0 ]; then
    i=1
    while [ "$i" -le "$TOTAL" ]; do
      eval "LB_WEIGHT_${i}=1"
      i=$((i + 1))
    done
    TOTAL_WEIGHT=$TOTAL
  else
    # 为未指定权重的后端设置默认权重 1
    i=1
    while [ "$i" -le "$TOTAL" ]; do
      eval "w=\$LB_WEIGHT_${i}"
      if [ -z "$w" ]; then
        eval "LB_WEIGHT_${i}=1"
        TOTAL_WEIGHT=$((TOTAL_WEIGHT + 1))
      fi
      i=$((i + 1))
    done
  fi

  # --- 3. 生成 split_clients（加权分流）---
  SC="
# ---- ${LOC_PATH} 加权分流 ----
split_clients \"\$request_id\" \$${PREFIX_NAME}_pool {"
  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "w=\$LB_WEIGHT_${i}"
    if [ "$i" -eq "$TOTAL" ]; then
      SC="${SC}
    * ${i};"
    else
      # 使用 awk 计算百分比（避免 shell 整除截断）
      pct=$(awk "BEGIN{printf \"%.1f\", ${w}/${TOTAL_WEIGHT}*100}")
      SC="${SC}
    ${pct}% ${i};"
    fi
    i=$((i + 1))
  done
  SC="${SC}
}"

  # --- 4. 生成 map（URL 和 Host 映射）---
  MAP_URL="
# ---- ${LOC_PATH} 后端 URL 映射 ----
map \$${PREFIX_NAME}_pool \$${PREFIX_NAME}_backend_url {"
  MAP_HOST="
# ---- ${LOC_PATH} 后端 Host 映射 ----
map \$${PREFIX_NAME}_pool \$${PREFIX_NAME}_backend_host {"

  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "u=\$LB_URL_${i}"
    eval "h=\$LB_HOST_${i}"
    MAP_URL="${MAP_URL}
    ${i} \"${u}\";"
    MAP_HOST="${MAP_HOST}
    ${i} \"${h}\";"
    i=$((i + 1))
  done
  MAP_URL="${MAP_URL}
}"
  MAP_HOST="${MAP_HOST}
}"

  # --- 5. 生成 failover map（环形：N → (N%TOTAL)+1）---
  FB_MAP_URL="
# ---- ${LOC_PATH} Failover URL 映射（环形）----
map \$${PREFIX_NAME}_pool \$${PREFIX_NAME}_fb_url {"
  FB_MAP_HOST="
# ---- ${LOC_PATH} Failover Host 映射（环形）----
map \$${PREFIX_NAME}_pool \$${PREFIX_NAME}_fb_host {"

  i=1
  while [ "$i" -le "$TOTAL" ]; do
    fb_idx=$(( (i % TOTAL) + 1 ))
    eval "fu=\$LB_URL_${fb_idx}"
    eval "fh=\$LB_HOST_${fb_idx}"
    FB_MAP_URL="${FB_MAP_URL}
    ${i} \"${fu}\";"
    FB_MAP_HOST="${FB_MAP_HOST}
    ${i} \"${fh}\";"
    i=$((i + 1))
  done
  FB_MAP_URL="${FB_MAP_URL}
}"
  FB_MAP_HOST="${FB_MAP_HOST}
}"

  # 累积到 http 层级配置
  LB_HTTP_BLOCK="${LB_HTTP_BLOCK}${SC}${MAP_URL}${MAP_HOST}${FB_MAP_URL}${FB_MAP_HOST}"

  # 打印分流比例
  echo "[entrypoint] Traffic split (total weight: $TOTAL_WEIGHT):"
  i=1
  while [ "$i" -le "$TOTAL" ]; do
    eval "w=\$LB_WEIGHT_${i}"
    eval "u=\$LB_URL_${i}"
    pct=$(awk "BEGIN{printf \"%.1f\", ${w}/${TOTAL_WEIGHT}*100}")
    fb_idx=$(( (i % TOTAL) + 1 ))
    eval "fu=\$LB_URL_${fb_idx}"
    echo "[entrypoint]   Pool $i → $u (${pct}%), failover → $fu"
    i=$((i + 1))
  done

  # --- 6. 生成 location 块（server 层级）---
  CHAIN_RESULT="
    # ============ 反向代理 - ${LOC_PATH} (负载均衡 + Failover) ============
    location ${LOC_PATH} {
        rewrite ^${LOC_PATH}(.*)\$ /\$1 break;
        proxy_pass \$${PREFIX_NAME}_backend_url;

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host \$${PREFIX_NAME}_backend_host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Original-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
${GEEK_BLOCK}
        # 超时配置（快速失败以便切 failover）
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # Failover 到环形下一个后端
        proxy_intercept_errors on;
        error_page ${FAILOVER_STATUS_CODES} = @${PREFIX_NAME}_failover;
    }

    # ============ 反向代理 - ${LOC_PATH} Failover ============
    location @${PREFIX_NAME}_failover {
        rewrite ^${LOC_PATH}(.*)\$ /\$1 break;
        proxy_pass \$${PREFIX_NAME}_fb_url;

        # HTTPS 上游：启用 SNI
        proxy_ssl_server_name on;
        proxy_set_header Host \$${PREFIX_NAME}_fb_host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Original-Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
${GEEK_BLOCK}
        # 超时配置
        proxy_connect_timeout 5s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }"
}

# --- 1. 生成 API 负载均衡配置 ---
generate_lb_config "APP_API" "/api/" "api" "yes"
API_LOCATIONS="$CHAIN_RESULT"

# --- 2. 生成配置 API 负载均衡配置 ---
# api-config 鉴权依赖 system-admin 版本和主站 Host 上下文；线上双后端滚动期间，
# 旧实例可能误判有效 token 为 401，因此这里对 401 做一次环形 failover。
generate_lb_config "APP_CONFIG" "/api-config/" "config" "yes" "401 502 503 504"
CONFIG_LOCATIONS="$CHAIN_RESULT"

# --- 3. 生成域名信息 API 负载均衡配置 ---
generate_lb_config "APP_DOMAIN" "/api-domain/" "domain" "no"
DOMAIN_LOCATIONS="$CHAIN_RESULT"

# --- 4. 生成 resolver 配置 ---
RESOLVER_SERVERS="${APP_RESOLVER:-8.8.8.8 223.5.5.5}"
RESOLVER_BLOCK="resolver ${RESOLVER_SERVERS} valid=30s ipv6=off;
resolver_timeout 5s;"
echo "[entrypoint] DNS resolver: ${RESOLVER_SERVERS} (valid=30s)"

# --- 5. 用 envsubst 处理其他 APP_ 变量（文档 API 等）---
# 排除编号变量（APP_API_N_*、APP_CONFIG_N_*、APP_DOMAIN_N_*）和 APP_RESOLVER，只替换其余 APP_ 变量
VARS=$(env | grep '^APP_' | grep -v '^APP_API_[0-9]' | grep -v '^APP_CONFIG_[0-9]' | grep -v '^APP_DOMAIN_[0-9]' | grep -v '^APP_RESOLVER' | sed 's/=.*//' | sed 's/^/\$/' | tr '\n' ' ')
if [ -n "$VARS" ]; then
  envsubst "$VARS" < "$TEMPLATE" > "$OUTPUT"
else
  cp "$TEMPLATE" "$OUTPUT"
fi

# --- 6. 注入动态生成的配置块 ---
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

# 注入 http 层级配置（resolver + split_clients + map）
inject_locations "# __RESOLVER__" "$RESOLVER_BLOCK"
inject_locations "# __LB_HTTP_BLOCK__" "$LB_HTTP_BLOCK"

# 注入 server 层级配置（location 块）
inject_locations "# __API_LOCATIONS__" "$API_LOCATIONS"
inject_locations "# __CONFIG_LOCATIONS__" "$CONFIG_LOCATIONS"
inject_locations "# __DOMAIN_LOCATIONS__" "$DOMAIN_LOCATIONS"

echo "[entrypoint] Nginx config generated at $OUTPUT"

# --- 7. 替换 plugins.json 中的插件 URL 占位符 ---
PLUGINS_FILE="/usr/share/nginx/html/config/plugins.json"
if [ -f "$PLUGINS_FILE" ]; then
  echo "[entrypoint] Substituting plugin URLs in $PLUGINS_FILE"
  echo "[entrypoint]   PLUGIN_USER_MANAGEMENT_URL=${PLUGIN_USER_MANAGEMENT_URL:-<not set>}"
  echo "[entrypoint]   PLUGIN_SYSTEM_ADMIN_URL=${PLUGIN_SYSTEM_ADMIN_URL:-<not set>}"
  echo "[entrypoint]   PLUGIN_AI_3D_GENERATOR_V3_URL=${PLUGIN_AI_3D_GENERATOR_V3_URL:-<not set>}"
  envsubst '$PLUGIN_USER_MANAGEMENT_URL $PLUGIN_SYSTEM_ADMIN_URL $PLUGIN_AI_3D_GENERATOR_V3_URL' \
    < "$PLUGINS_FILE" > "${PLUGINS_FILE}.tmp" && mv "${PLUGINS_FILE}.tmp" "$PLUGINS_FILE"
fi

# --- 8. 生成运行时环境变量注入文件 ---
ENV_JS="/usr/share/nginx/html/__env.js"
echo "[entrypoint] Generating runtime env injection at $ENV_JS"
cat > "$ENV_JS" <<EOF
window.__ENV__ = {
  BLOCKLY_URL: "${APP_BLOCKLY_URL:-}",
  EDITOR_URL: "${APP_EDITOR_URL:-}"
};
EOF
echo "[entrypoint] Runtime env: BLOCKLY_URL=${APP_BLOCKLY_URL:-<not set>}, EDITOR_URL=${APP_EDITOR_URL:-<not set>}"

# --- 9. 启动 nginx ---
exec nginx -g 'daemon off;'
