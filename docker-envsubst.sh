#!/bin/sh
# Generate env-config.js from template before nginx starts
# This runs as a docker-entrypoint.d script (before nginx)
set -e
envsubst '${APP_DOMAIN_INFO_API_URL} ${APP_BACKUP_DOMAIN_INFO_API_URL}' \
  < /etc/nginx/env-config.js.template \
  > /usr/share/nginx/html/env-config.js
