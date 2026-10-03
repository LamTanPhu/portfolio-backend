# Docker Guide — Portfolio Backend

Everything you need to go from zero to a running API + Postgres in containers.
Two paths: **A) Compose (what you'll actually use)** and **B) Plain `docker` commands (to understand what Compose does for you)**.

> Files this guide uses: `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env.docker.example` (all at the repo root).

---

## 0. Install & sanity check

Install **Docker Desktop** (Windows/macOS) or Docker Engine + Compose plugin (Linux). On Windows, use the WSL2 backend.

```bash
docker --version
docker compose version     # must be v2 (space, not hyphen)
docker run --rm hello-world
```

---

## 1. Mental model (5 minutes, worth it)

| Concept | What it is | In this project |
|---|---|---|
| **Image** | Read-only template: OS + Node + your compiled code | `portfolio-api:local`, `portfolio-migrate:local` |
| **Container** | A running (or stopped) instance of an image | `portfolio-api-1`, `portfolio-db-1` |
| **Volume** | Storage managed by Docker that outlives containers | `portfolio_pgdata` → Postgres data |
| **Network** | Private virtual LAN; containers resolve each other by **name** | `portfolio_backend`; the API reaches Postgres at host `db` |
| **Port mapping** | Hole from host → container | `127.0.0.1:3001 → api:3001` |
| **Dockerfile** | Recipe that builds an image | multi-stage, see below |
| **Compose** | One YAML that declares all the above and starts them in order | `compose.yaml` |

Key consequences:
- **Containers are disposable, volumes are not.** `docker compose down` deletes containers, keeps data. `down -v` deletes the data too.
- Inside a container, `localhost` means *that container*. Your `.env` has `localhost:5432` for local dev; in Docker the DB host is **`db`**.
- The DB has **no published port** by default. Only the API container can reach it. That's the security default.

---

## 2. What the Dockerfile does (stage by stage)

```
base ──► deps ──► build ──► migrate   (TARGET: Prisma CLI + ts-node, runs migrations/seed)
  │                 │
  ├──► prod-deps ───┴──► runtime      (TARGET, default: small non-root image that serves the API)
```

| Stage | Purpose |
|---|---|
| `base` | `node:26-bookworm-slim` + `openssl` + CA certs. Node 26 matches your CI; override with `--build-arg NODE_VERSION=24`. |
| `deps` | `npm ci` with dev deps. Cached until `package*.json` changes (fast rebuilds). |
| `build` | `prisma generate` → `nest build` → asserts `dist/src/main.js` exists. |
| `prod-deps` | `npm ci --omit=dev` — no TypeScript, jest, eslint in the final image. |
| `migrate` | Built from `build`, so it has the Prisma CLI. Runs `prisma migrate deploy`. Used as a one-shot job. |
| `runtime` | prod `node_modules` + generated Prisma client + `dist/`. Runs as user `node` (not root), has a HEALTHCHECK on `/api/health`. |

Why a separate `migrate` image? `prisma` is a devDependency, so the slim runtime image doesn't have it — and shouldn't (smaller attack surface). Migrations run in their own short-lived container instead.

> **Heads-up (real bug found while writing this):** `package.json` has `"start:prod": "node dist/main"`, but your build actually emits `dist/src/main.js` (because `prisma.config.ts` is inside the TS compile scope, so the output root is the repo root). The Dockerfile uses the correct path. Anything else that runs `npm run start:prod` (Render's start command, a bare VM) will crash with "Cannot find module dist/main" until you either change that script to `node dist/src/main` or add `"include": ["src/**/*"]` to `tsconfig.build.json`.

---

## 3. Path A — Compose (recommended)

### 3.1 Create the env file
```bash
cp .env.docker.example .env.docker
```
Then edit `.env.docker`:
1. Generate secrets: `openssl rand -hex 48` (run it 3×: `JWT_SECRET`, `COOKIE_SECRET`, `SNAKE_CAPTCHA_SECRET`).
2. Generate a DB password: `openssl rand -hex 24`. Put it in **both** `POSTGRES_PASSWORD` and inside `DATABASE_URL`. If they differ, the API can't connect.
3. Keep `@db:5432` in `DATABASE_URL` — never `localhost`.
4. `.env.docker` must be git-ignored — use the updated `.gitignore` (it ignores every `.env.*` except the two `*.example` templates). Verify: `git check-ignore -v .env.docker` prints a rule, and `git status` does not list it.

On Windows without `openssl`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### 3.2 Build and start
```bash
docker compose up -d --build
```
Order that happens automatically:
1. `db` starts → healthcheck `pg_isready` passes
2. `migrate` runs `prisma migrate deploy`, exits 0
3. `api` starts (only if `migrate` succeeded)

### 3.3 Verify
```bash
docker compose ps                       # db: healthy, migrate: exited (0), api: healthy
docker compose logs -f api              # look for "All required configuration validated successfully"
curl -i http://127.0.0.1:3001/api/health
```
Expect `200` with `{"status":"ok", ... "database":{"status":"up"}}`.
`docker compose ps` shows `api` as `healthy` after ~40 s (start period).

### 3.4 Seed the admin user (once)
`prisma/seed.ts` is gitignored and deliberately **not** copied into any image. Mount it for a one-off run:
```bash
cp prisma/seed.example.ts prisma/seed.ts          # if you don't have it yet
docker compose run --rm \
  -v "$(pwd)/prisma/seed.ts:/app/prisma/seed.ts:ro" \
  migrate npx ts-node prisma/seed.ts
```
(PowerShell: replace `$(pwd)` with `${PWD}`.) It reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.docker`.

### 3.5 Daily commands
```bash
docker compose up -d                 # start (no rebuild)
docker compose up -d --build         # rebuild after code changes
docker compose logs -f api           # follow logs
docker compose restart api
docker compose stop                  # stop, keep everything
docker compose down                  # remove containers + network, KEEP data volume
docker compose down -v               # ⚠ also DELETE the database volume
docker compose exec db psql -U portfolio -d portfolio     # SQL shell
docker compose exec api sh           # shell in the API (read-only FS, non-root)
```

---

## 4. Path B — the same thing with plain `docker` commands

This is exactly what Compose automates. Do it once to learn it, then use Compose.

```bash
# 1) Network — private LAN so containers find each other by name
docker network create portfolio-net

# 2) Volume — persistent storage for Postgres
docker volume create portfolio-pgdata

# 3) Database container
docker run -d --name portfolio-db \
  --network portfolio-net \
  --env-file .env.docker \
  -v portfolio-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:17-alpine
#   (no -p flag → not reachable from the host or the internet)

# wait until ready
docker exec portfolio-db pg_isready -U portfolio -d portfolio

# 4) Build the two images
docker build --target migrate -t portfolio-migrate:local .
docker build --target runtime -t portfolio-api:local .
docker images | grep portfolio

# 5) Run migrations (one-shot container, auto-removed)
docker run --rm --network portfolio-net --env-file .env.docker portfolio-migrate:local

# 6) Run the API
docker run -d --name portfolio-api \
  --network portfolio-net \
  --env-file .env.docker \
  -p 127.0.0.1:3001:3001 \
  --init --restart unless-stopped \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --memory 512m \
  portfolio-api:local

# 7) Check
docker ps
docker logs -f portfolio-api
curl -i http://127.0.0.1:3001/api/health
```

Tear down:
```bash
docker rm -f portfolio-api portfolio-db
docker network rm portfolio-net
docker volume rm portfolio-pgdata        # ⚠ deletes the data
```

---

## 5. Data: volumes, backup, restore

Inspect:
```bash
docker volume ls
docker volume inspect portfolio_pgdata        # Compose prefixes the project name
```

**Backup** (logical dump — portable, recommended):
```bash
docker compose exec -T db pg_dump -U portfolio -d portfolio -Fc > backup_$(date +%F).dump
```

**Restore** into a fresh DB:
```bash
docker compose exec -T db pg_restore -U portfolio -d portfolio --clean --if-exists < backup_2026-10-03.dump
```

**Test your backup** at least once by restoring into a throwaway stack. An untested backup is a hope, not a backup.

Volume-level backup (stop the DB first):
```bash
docker compose stop db
docker run --rm -v portfolio_pgdata:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/pgdata.tgz -C /data .
docker compose start db
```

---

## 6. Networking explained

- Compose creates `portfolio_backend` (bridge). Service names are DNS names: `db`, `api`, `migrate`.
- `api` → `db:5432` works because both are on that network.
- Published port `127.0.0.1:3001:3001` = *host loopback only*. Other machines on your Wi-Fi **cannot** reach it.
  - To expose to your LAN for testing from a phone: `API_BIND=0.0.0.0 docker compose up -d` (PowerShell: `$env:API_BIND="0.0.0.0"; docker compose up -d`). Turn it back off afterwards.
- The frontend running on your host (`localhost:3000`) calls `http://localhost:3001` — works. Make sure `FRONTEND_URL=http://localhost:3000` is in `.env.docker` or CORS will block it.
- `TRUST_PROXY_HOPS=0` is correct while nothing sits in front of the API. If it were `1` with no proxy, any client could forge `X-Forwarded-For` and dodge your rate limiter / fingerprint check. Set to `1` only behind exactly one proxy.

---

## 7. Hardening already applied (and why)

| Setting | Effect |
|---|---|
| Multi-stage build, `--omit=dev` | No compiler/test tooling in the shipped image |
| `USER node` | App is not root inside the container |
| `read_only: true` + `tmpfs /tmp` | Attacker can't write/persist files (your app writes none) |
| `cap_drop: ALL`, `no-new-privileges` | No Linux capabilities, no privilege escalation |
| DB not published | Postgres is not reachable from outside the Docker network |
| `mem_limit`, `pids_limit` | Runaway process can't take down the host |
| `.dockerignore` excludes `.env*`, `seed.ts` | Secrets never enter image layers |
| `HEALTHCHECK` on `/api/health` | Orchestrators/Compose can detect a dead app (health also checks the DB) |

Still your job:
- Never put secrets in `ARG`/`ENV` in the Dockerfile. They're visible via `docker history`.
- Rebuild periodically for base-image security patches: `docker compose build --pull --no-cache`.
- Scan images: `docker scout quickview portfolio-api:local` (Docker Desktop) or `trivy image portfolio-api:local`.
- Don't run `docker compose` with `-v` on a machine holding the only copy of your data.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `api` restarts in a loop, log says `Missing or empty required environment variable: X` | Add `X` to `.env.docker`. Required: `JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, COOKIE_SECRET, DATABASE_URL, TURNSTILE_SECRET_KEY, SNAKE_CAPTCHA_SECRET, RESEND_API_KEY`. |
| `migrate` fails: `P1001 Can't reach database server at localhost` | `DATABASE_URL` still says `localhost`; must be `@db:5432`. |
| `P1000 Authentication failed` / `password authentication failed` | Password in `DATABASE_URL` ≠ `POSTGRES_PASSWORD`. Postgres only reads `POSTGRES_PASSWORD` on **first** init of the volume. After changing it: `docker compose down -v` (wipes data) and start again, or `ALTER USER` inside psql. |
| Build error: `@prisma/client did not initialize yet` | `prisma generate` step failed or was skipped; rebuild with `--no-cache` and read the `build` stage output. |
| `Cannot find module '/app/dist/main'` | Something is running `dist/main` instead of `dist/src/main.js` (see heads-up in §2). |
| `curl` → connection refused right after `up` | App still booting; wait for `docker compose ps` to show `healthy`. |
| Browser: CORS error | `FRONTEND_URL` must exactly match the page origin (scheme + host + port, no trailing slash). |
| Login works in Postman but cookie missing in browser | `NODE_ENV=production` sets the `Secure` cookie flag; Chrome/Firefox accept it on `localhost` over HTTP, **Safari does not**. Also cookie is `SameSite=Strict` — frontend and API must be same-site. |
| Port 3001 already in use | Stop your local `npm run start:dev`, or change the left side of the port mapping. |
| Windows: `exec ... no such file` / weird line endings | Ensure `.gitattributes` / editor uses LF for shell scripts (none shipped here, but keep in mind). |
| Disk filling up | `docker system df` then `docker image prune -f` / `docker builder prune`. |

---

## 9. Cheat sheet

```bash
docker ps -a                      # all containers
docker images                     # all images
docker logs --tail 100 -f <name>  # logs
docker exec -it <name> sh         # shell
docker inspect <name>             # full config (incl. health)
docker stats                      # live CPU/RAM
docker compose config             # print the fully-resolved compose file (catches typos)
docker system prune               # remove stopped containers, dangling images, unused networks
```
