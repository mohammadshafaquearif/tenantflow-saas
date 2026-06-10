FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

RUN npm ci --workspace=backend 2>/dev/null || npm install --workspace=backend

COPY backend/ ./backend/

RUN npm run build --workspace=backend

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S tenantflow -u 1001 -G nodejs

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

RUN npm ci --omit=dev --workspace=backend 2>/dev/null || npm install --omit=dev --workspace=backend

COPY --from=builder /app/backend/dist ./backend/dist

USER tenantflow

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "backend/dist/server.js"]
