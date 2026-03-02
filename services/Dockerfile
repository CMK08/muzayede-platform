# =============================================================================
# Shared multi-stage Dockerfile for all NestJS microservices
# Usage: docker build --build-arg SERVICE_NAME=auth-service -f services/Dockerfile .
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
ARG SERVICE_NAME
COPY services/${SERVICE_NAME}/package.json services/${SERVICE_NAME}/
RUN pnpm install --frozen-lockfile --filter @muzayede/${SERVICE_NAME}... --filter @muzayede/database

# -- Build stage --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
ARG SERVICE_NAME
COPY --from=deps /app/services/${SERVICE_NAME}/node_modules ./services/${SERVICE_NAME}/node_modules
COPY packages/database/ packages/database/
COPY services/${SERVICE_NAME}/ services/${SERVICE_NAME}/
COPY tsconfig.base.json ./
RUN cd packages/database && npx prisma generate
RUN cd services/${SERVICE_NAME} && npx nest build

# -- Production stage ---------------------------------------------------------
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app
ENV NODE_ENV=production

ARG SERVICE_NAME
COPY --from=build /app/services/${SERVICE_NAME}/dist ./dist
COPY --from=build /app/services/${SERVICE_NAME}/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/database/node_modules/.prisma ./node_modules/.prisma

USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
