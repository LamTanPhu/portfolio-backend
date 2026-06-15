# Portfolio Backend

NestJS REST API for a personal portfolio — built with Clean Architecture, Prisma ORM, Redis cache (SWR), and JWT authentication.

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

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

> Tip: use Docker to spin up Postgres and Redis locally without installing them directly.

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:15
docker run -d --name redis -p 6379:6379 redis:7
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

See `.env.example` for the full list with descriptions. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_POOL_SIZE` | Connection pool size (default: 10) |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_ADDRESS` | Verified sender address (e.g. `Portfolio <hello@yourdomain.com>`) |
| `CLOUDFLARE_TURNSTILE_SECRET` | Turnstile secret for contact form bot protection |
| `USE_HTTPS` | Set to `true` to enable HTTPS (requires cert files) |
| `CERT_KEY_PATH` | Path to TLS key (only when `USE_HTTPS=true`) |
| `CERT_CERT_PATH` | Path to TLS cert (only when `USE_HTTPS=true`) |

---

## API Endpoints

Swagger UI available at `http://localhost:3001/api/docs` in development.

### Public

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/about/skills` | Skills grouped by category |
| `GET` | `/api/about/education` | Education records |
| `GET` | `/api/about/jobs` | Work experience |
| `GET` | `/api/about/certifications` | Published certifications |
| `GET` | `/api/about/social` | Social accounts |
| `GET` | `/api/blogs` | Published blog post summaries |
| `GET` | `/api/blogs/:slug` | Full blog post |
| `GET` | `/api/projects` | Published projects |
| `GET` | `/api/projects/:slug` | Single project detail |
| `GET` | `/api/spotify/now-playing` | Currently playing Spotify track |
| `POST` | `/api/contact` | Submit contact form (Turnstile protected) |
| `POST` | `/api/analytics/page-view` | Record a page view |

### Admin (JWT required)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/login` | Login — returns access token + sets refresh cookie |
| `POST` | `/api/auth/refresh` | Refresh access token via httpOnly cookie |
| `POST` | `/api/auth/logout` | Revoke refresh token |
| `GET` | `/api/auth/me` | Current user profile |
| `POST/PUT/DELETE` | `/api/blogs/*` | Blog CRUD |
| `POST/PUT/DELETE` | `/api/projects/*` | Project CRUD |
| `POST/PUT/DELETE` | `/api/about/*` | Skills / Education / Jobs / Certifications CRUD |
| `GET` | `/api/analytics` | Page view stats |
| `GET` | `/api/contact` | Contact form submissions |

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

Build the app and run the compiled output:

```bash
npm run build
node dist/main
```

Make sure all environment variables are set in production, especially `USE_HTTPS`, cert paths, and a strong `JWT_SECRET`.