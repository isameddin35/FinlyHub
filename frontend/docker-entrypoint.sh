#!/bin/sh

# Replace API_URL placeholder in nginx config
sed -i "s|\${API_URL:-/api}|${API_URL:-/api}|g" /etc/nginx/conf.d/default.conf

exec "$@"