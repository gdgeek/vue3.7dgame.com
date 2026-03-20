#!/bin/sh

# 1. 使用 envsubst 将环境变量注入 Nginx 配置模板
envsubst '${APP_API_URL} ${APP_BACKUP_API_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Nginx config generated with:"
echo "  APP_API_URL=${APP_API_URL}"
echo "  APP_BACKUP_API_URL=${APP_BACKUP_API_URL}"

# 2. 注入全局变量到 index.html（用于 failover 等场景）
INJECT="<script>"
[ -n "$APP_API_URL" ] && INJECT="${INJECT}window.__API_URL__='${APP_API_URL}';"
[ -n "$APP_BACKUP_API_URL" ] && INJECT="${INJECT}window.__BACKUP_API_URL__='${APP_BACKUP_API_URL}';"
[ -n "$APP_DOMAIN_INFO_API_URL" ] && INJECT="${INJECT}window.__DOMAIN_INFO_API_URL__='${APP_DOMAIN_INFO_API_URL}';"
[ -n "$APP_BACKUP_DOMAIN_INFO_API_URL" ] && INJECT="${INJECT}window.__BACKUP_DOMAIN_INFO_API_URL__='${APP_BACKUP_DOMAIN_INFO_API_URL}';"
INJECT="${INJECT}</script>"

if [ "$INJECT" != "<script></script>" ]; then
  sed -i "s|<head>|<head>${INJECT}|" /usr/share/nginx/html/index.html
  echo "Injected global variables into index.html"
fi

# 3. 启动 nginx
exec nginx -g 'daemon off;'
