# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Native deps for better-sqlite3
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    DATABASE_PATH=/data/app.db

COPY --from=build /app/.output ./.output
# better-sqlite3 native module ships in node_modules of the output? No — Nitro bundles JS only.
# We copy node_modules for the native binding to be present.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /data

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/trainers > /dev/null || exit 1

CMD ["node", ".output/server/index.mjs"]
