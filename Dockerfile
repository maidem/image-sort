# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Native deps for better-sqlite3 (used for local dev, installed but not used in production)
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    NUXT_UPLOAD_PATH=/data/uploads

COPY --from=build /app/.output ./.output

RUN mkdir -p /data/uploads && chown -R app:app /data

VOLUME ["/data/uploads"]
EXPOSE 3000
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3000/api/categories > /dev/null || exit 1

CMD ["node", ".output/server/index.mjs"]
