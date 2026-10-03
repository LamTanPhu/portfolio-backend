# syntax=docker/dockerfile:1.7
# =============================================================================
# Portfolio Backend — multi-stage Dockerfile (NestJS + Prisma 7 + PostgreSQL)
#
# Stages:
#   base       shared OS layer (node + openssl + CA certs)
#   deps       ALL dependencies (dev included) — cached unless package*.json changes
#   build      prisma generate + nest build
#   prod-deps  production-only node_modules (what the runtime image ships)
#   migrate    TARGET: has the Prisma CLI + ts-node; runs `prisma migrate deploy` / seed
#   runtime    TARGET (default, last stage): minimal, non-root image that serves the API
#
# Build examples:
#   docker build -t portfolio-api:local .                      # runtime image
#   docker build --target migrate -t portfolio-migrate:local . # migration/seed image
# =============================================================================

# Matches CI (Node 26). Override: docker build --build-arg NODE_VERSION=24 .
ARG NODE_VERSION=26

# ---------------------------------------------------------------------------
# base
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
# openssl: needed by Prisma's schema engine (migrate). ca-certificates: outbound TLS
# (Resend, Spotify, Cloudflare Turnstile).
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# deps — full install (dev deps needed for build, prisma CLI, ts-node)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# build — generate Prisma client, compile TypeScript
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
# prisma.config.ts reads DATABASE_URL at load time; `generate` never connects, so a
# throwaway value is fine. It is NOT baked into any final image (build stage only).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate
RUN npm run build
# Fail the build loudly if the entrypoint isn't where CMD expects it.
# (tsconfig compiles prisma.config.ts too, so rootDir is the repo root and the
#  entry is dist/src/main.js — NOT dist/main.js as package.json "start:prod" assumes.)
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found — entrypoint moved, fix CMD" && ls -R dist | head -40 && exit 1)

# ---------------------------------------------------------------------------
# prod-deps — runtime node_modules only
# ---------------------------------------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# ---------------------------------------------------------------------------
# migrate — one-shot job image (migrations + optional seed). Not for serving.
# ---------------------------------------------------------------------------
FROM build AS migrate
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# runtime — the image that actually runs (LAST stage = default build target)
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Generated Prisma client lives in node_modules/.prisma — copy it over the prod install.
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

# Build-time proof the Prisma client is present and loadable.
RUN node -e "require('@prisma/client'); console.log('prisma client OK')"

USER node
EXPOSE 3001

# Node image has no curl/wget — use node itself. /api/health also checks the DB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# exec form → node is PID 1's child via compose `init: true` (or `docker run --init`)
# so SIGTERM reaches Nest's shutdown hooks.
CMD ["node", "dist/src/main.js"]
