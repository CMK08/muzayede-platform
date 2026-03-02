# =============================================================================
# Dockerfile for analytics-service
# Usage: docker build -f services/analytics-service/Dockerfile .
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
COPY services/analytics-service/package.json services/analytics-service/
RUN pnpm install --frozen-lockfile --filter @muzayede/analytics-service... --filter @muzayede/database

# -- Build stage --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/services/analytics-service/node_modules ./services/analytics-service/node_modules
COPY packages/database/ packages/database/
COPY services/analytics-service/ services/analytics-service/
COPY tsconfig.base.json ./
RUN cd packages/database && npx prisma generate
RUN cd services/analytics-service && npx nest build

# -- Production stage ---------------------------------------------------------
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/analytics-service/dist ./dist
COPY --from=build /app/services/analytics-service/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database/node_modules/.prisma ./node_modules/.prisma
USER nestjs
EXPOSE 3013
CMD ["node", "dist/main.js"]
