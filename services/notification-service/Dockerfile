# =============================================================================
# Dockerfile for notification-service
# Usage: docker build -f services/notification-service/Dockerfile .
# Build context must be the monorepo root.
# =============================================================================

# -- Base stage ---------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# -- Dependencies stage -------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json packages/database/
COPY services/notification-service/package.json services/notification-service/
RUN pnpm install --frozen-lockfile --filter @muzayede/notification-service... --filter @muzayede/database

# -- Build stage --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/services/notification-service/node_modules ./services/notification-service/node_modules
COPY packages/database/ packages/database/
COPY services/notification-service/ services/notification-service/
COPY tsconfig.base.json ./
RUN cd packages/database && npx prisma generate
RUN cd services/notification-service && npx nest build

# -- Production stage ---------------------------------------------------------
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/notification-service/dist ./dist
COPY --from=build /app/services/notification-service/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database/node_modules/.prisma ./node_modules/.prisma
USER nestjs
EXPOSE 3006
CMD ["node", "dist/main.js"]
