#!/bin/sh
set -e

# Baca semua secret dan export sebagai env var
export MONGO_URL="$(cat /run/secrets/mongo_url)"
export JWT_SECRET="$(cat /run/secrets/jwt_secret)"
export ADMIN_PASSWORD="$(cat /run/secrets/admin_password)"
export RESEND_API_KEY="$(cat /run/secrets/resend_api_key)"

# Jalankan Uvicorn
exec uvicorn server:app \
  --host 0.0.0.0 \
  --port 8003 \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips "*" \
  --no-server-header