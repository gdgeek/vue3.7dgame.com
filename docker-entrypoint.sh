#!/bin/sh
# 如果设置了 VITE_APP_API_URL 环境变量，替换构建时的默认值
if [ -n "$VITE_APP_API_URL" ]; then
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|{scheme}//api.{domain}|${VITE_APP_API_URL}|g" {} +
  echo "API URL replaced with: $VITE_APP_API_URL"
fi

if [ -n "$VITE_APP_AUTH_API" ]; then
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|{scheme}//auth.{domain}|${VITE_APP_AUTH_API}|g" {} +
  echo "Auth API replaced with: $VITE_APP_AUTH_API"
fi

if [ -n "$VITE_APP_AI_API" ]; then
  find /usr/share/nginx/html -type f -name '*.js' -exec sed -i "s|https://rodin.01xr.com|${VITE_APP_AI_API}|g" {} +
  echo "AI API replaced with: $VITE_APP_AI_API"
fi

# 启动 nginx
exec nginx -g 'daemon off;'
