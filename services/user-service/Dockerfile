# =============================================================================
# Dockerfile for user-service
# Usage: docker build -f services/user-service/Dockerfile .
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
COPY services/user-service/package.json services/user-service/
RUN pnpm install --frozen-lockfile --filter @muzayede/user-service... --filter @muzayede/database

# -- Build stage --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/services/user-service/node_modules ./services/user-service/node_modules
COPY packages/database/ packages/database/
COPY services/user-service/ services/user-service/
COPY tsconfig.base.json ./
RUN cd packages/database && npx prisma generate
RUN cd services/user-service && npx nest build

# -- Production stage ---------------------------------------------------------
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/user-service/dist ./dist
COPY --from=build /app/services/user-service/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database/node_modules/.prisma ./node_modules/.prisma
USER nestjs
EXPOSE 3002
CMD ["node", "dist/main.js"]
