#!/bin/sh
# 如果设置了 APP_API_URL 环境变量，替换构建时的默认值
if [ -n "$APP_API_URL" ]; then
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|{scheme}//api.{domain}|${APP_API_URL}|g" {} +
  echo "API URL replaced with: $APP_API_URL"
fi

if [ -n "$APP_AUTH_API" ]; then
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|{scheme}//auth.{domain}|${APP_AUTH_API}|g" {} +
  echo "Auth API replaced with: $APP_AUTH_API"
fi

if [ -n "$APP_AI_API" ]; then
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|https://rodin.01xr.com|${APP_AI_API}|g" {} +
  echo "AI API replaced with: $APP_AI_API"
fi

# Inject global variables into index.html for Failover support
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

# 启动 nginx
exec nginx -g 'daemon off;'
