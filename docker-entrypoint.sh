#!/bin/sh
set -e

# Fix permissions on the uploads volume (may be mounted as root by Coolify)
mkdir -p /data/uploads
chown -R app:app /data

# Drop to app user and start server
exec su-exec app node /app/.output/server/index.mjs
