#!/bin/sh
# Generate env-config.js from template before nginx starts
# This runs as a docker-entrypoint.d script (before nginx)
set -e

# Extract host from URL: https://api.example.com -> api.example.com
extract_host() {
  echo "$1" | sed 's|^https\?://||' | sed 's|/.*||'
}

# Auto-derive HOST variables from URL variables for nginx proxy_set_header Host
export APP_API_HOST=$(extract_host "${APP_API_URL:-}")
export APP_BACKUP_API_HOST=$(extract_host "${APP_BACKUP_API_URL:-}")

envsubst '${APP_DOMAIN_INFO_API_URL} ${APP_BACKUP_DOMAIN_INFO_API_URL}' \
  < /etc/nginx/env-config.js.template \
  > /usr/share/nginx/html/env-config.js
