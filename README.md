# Portfolio Backend

NestJS REST API for a personal portfolio — built with Clean Architecture, Prisma ORM, JWT authentication, and a Redis-with-in-memory-fallback cache layer (SWR pattern; runs in-memory by default, Redis is opt-in).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Cache | Redis — Stale-While-Revalidate pattern |
| Auth | JWT (access + httpOnly refresh cookie) + JTI revocation |
| Email | Resend |
| Bot protection | Cloudflare Turnstile |
| Validation | class-validator + class-transformer |

---

## Prerequisites

- Node.js 20+ (CI runs 24 — use 24 if you want an exact match)
- PostgreSQL 15+
- Redis — **optional.** The app runs on an in-memory cache by default (that's also what production runs on right now — see `.env.example`). Only set `REDIS_URL` if you want to switch to Redis.

> Tip: use Docker to spin up Postgres locally without installing it directly.

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:15
# Redis is optional — only run this if you're setting REDIS_URL:
# docker run -d --name redis -p 6379:6379 redis:7
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Run database migrations
npx prisma migrate deploy

# 4. (Optional) Inspect the database
npx prisma studio

# 5. Seed the admin user — run once
npx ts-node prisma/seed.ts
```

---

## Running the App

```bash
# Development
npm run start:dev

# Standard (no watch)
npm run start

# Production
npm run start:prod
```

---

## Environment Variables

See `.env.example` for the full list with descriptions. All variables below are **required** to boot (checked by `ConfigValidationService`) unless noted optional.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | Connection pool size (default: 10; lower on free-tier PaaS) |
| `FRONTEND_URL` | Comma-separated allowed CORS origins |
| `JWT_SECRET` | Secret used to sign both access and refresh tokens (there is no separate refresh secret) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The single admin account's login credentials |
| `COOKIE_SECRET` | Secret for signing the httpOnly refresh cookie |
| `FINGERPRINT_STRICT` | Optional, default `true` — enforces device-fingerprint matching on token verification |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret for contact-form bot protection |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_ADDRESS` | Verified sender address (e.g. `Portfolio <hello@yourdomain.com>`) |
| `REDIS_URL` (+ `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`) | Optional — unset by default, in-memory cache is used instead |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` | Optional — powers `GET /api/spotify/now-playing` |
| `USE_HTTPS` | Set to `true` to enable HTTPS (requires cert files) |
| `CERT_KEY_PATH` / `CERT_CERT_PATH` | Path to TLS key/cert (only when `USE_HTTPS=true`) |

---

## API Endpoints

Swagger UI available at `http://localhost:3001/api/docs` in development. Full route map below, verified against the controllers directly — grouped by resource, not by "public/admin" file location, since several resources (certifications, education, jobs, skills, social) mix public reads and admin writes on the *same* controller rather than living under `/about/*`.

All mutations use `PATCH` for updates, never `PUT` (the CORS config only allows `GET, POST, PATCH, DELETE`).

### Public (no auth)

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/api/health` | Liveness/readiness probe |
| `GET` | `/api/about/skills` \| `/education` \| `/jobs` \| `/certifications` \| `/social` | Read-only aggregator views |
| `GET` | `/api/blogs` | Published blog summaries |
| `GET` | `/api/blogs/search` | Blog search |
| `GET` | `/api/blogs/:slug` | Full blog post |
| `GET` | `/api/projects` | Published projects |
| `GET` | `/api/projects/:slug` | Single project |
| `GET` | `/api/certifications` \| `/api/education` \| `/api/jobs` \| `/api/skills` \| `/api/social` | Published items — each is its own top-level resource, not nested under `/about` |
| `GET` | `/api/spotify/now-playing` | Currently playing track |
| `POST` | `/api/contact` | Contact form (Turnstile-protected) |
| `POST` | `/api/analytics/page-view` | Record a page view |
| `POST` | `/api/analytics/project-view/:id` | Record a project view |
| `POST` | `/api/analytics/resume-download` | Record a resume download |

### Admin (JWT required)

| Method | Route | Notes |
|--------|-------|-------|
| `POST` | `/api/auth/login` | Returns access token, sets refresh cookie |
| `POST` | `/api/auth/refresh` | Rotates both tokens via httpOnly cookie |
| `POST` | `/api/auth/logout` | Revokes both tokens |
| `GET` / `PATCH` | `/api/user/profile` | Current admin's own profile (there is no `/api/auth/me`) |
| `GET` | `/api/blogs/admin` | Draft + published listing |
| `POST` \| `PATCH :id` \| `DELETE :id` | `/api/blogs` | Blog CRUD |
| `POST` \| `PATCH :id` \| `DELETE :id` | `/api/projects` | Project CRUD |
| `POST` \| `PATCH :id` \| `DELETE :id` | `/api/certifications` \| `/api/education` \| `/api/jobs` \| `/api/skills` \| `/api/social` | Each resource CRUD'd on its own controller |
| `GET` | `/api/analytics/page-views` | Aggregate stats |
| `GET` | `/api/contact` | Submitted messages |
| `DELETE` | `/api/contact/:id` | Delete a message |
| `GET` | `/api/audit` | Paginated admin activity trail |

---

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/              # Entities, value objects, domain errors, repository interfaces
├── application/         # Use cases (commands + queries), DTOs, ports, services
├── infrastructure/      # Prisma repos, cache, mail, Spotify, config
└── interface-adapters/  # NestJS controllers, guards, filters, modules
```

Domain and Application layers have zero NestJS or Prisma imports — only plain TypeScript interfaces and classes.

---

## Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## Deployment

Deploys automatically: `cd.yml` fires after `ci.yml` passes on `main` and hits Render's deploy hook (`RENDER_DEPLOY_HOOK_URL` secret) — a broken build or a failing e2e test never reaches production. Render's "Pre-Deploy Command" should be set to `npx prisma migrate deploy` so schema changes apply on every deploy. To ship manually instead:

```bash
npm run build
node dist/main
```

Make sure all environment variables are set in production, especially `USE_HTTPS`, cert paths, and a strong `JWT_SECRET`.

Also running: CodeQL, OSV-Scanner, and Gitleaks scan every push/PR to `main`; Stryker mutation testing runs weekly. See `SECURITY.md` and `CONTINGENCY.md` for what's covered and what to do if something breaks.