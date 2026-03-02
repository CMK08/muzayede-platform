# =============================================================================
# Dockerfile for api-gateway
# Usage: docker build -f services/api-gateway/Dockerfile .
# Build context must be the monorepo root.
# =============================================================================

# -- Base stage ---------------------------------------------------------------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# -- Dependencies stage -------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api-gateway/package.json services/api-gateway/
RUN pnpm install --frozen-lockfile --filter @muzayede/api-gateway...

# -- Build stage --------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/api-gateway/node_modules ./services/api-gateway/node_modules
COPY services/api-gateway/ services/api-gateway/
COPY tsconfig.base.json ./
RUN cd services/api-gateway && npx nest build

# -- Production stage ---------------------------------------------------------
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/services/api-gateway/dist ./dist
COPY --from=build /app/services/api-gateway/package.json ./
COPY --from=build /app/node_modules ./node_modules
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]
