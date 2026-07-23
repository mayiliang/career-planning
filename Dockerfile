FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /app

# 先复制依赖清单，充分利用 Docker 构建缓存。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/content-parser/package.json packages/content-parser/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS server

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=41730 \
    DATA_DIR=/app/data \
    AUTO_BOOTSTRAP=true \
    AUTO_BACKUP=true \
    AUTO_BACKUP_INTERVAL_HOURS=24

WORKDIR /app
COPY --from=build /app /app

EXPOSE 41730
VOLUME ["/app/data"]
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:41730/api/v1/system/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "apps/server/dist/index.js"]

FROM nginx:1.27-alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["wget", "--quiet", "--tries=1", "--spider", "http://127.0.0.1/"]
