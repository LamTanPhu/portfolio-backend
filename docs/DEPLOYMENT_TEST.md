# Deployment Test Plan — Docker stack first, Render + Neon later

Goal: prove the containerized backend behaves like production **before** you pay attention to any cloud.
Run this top to bottom. Every step has an expected result; anything else is a bug to fix now, not after going live.

Prereq: you finished `DOCKER_GUIDE.md` §3 (stack up, admin seeded).

---

## Phase 1 — Does it boot correctly?

| # | Command | Expected |
|---|---|---|
| 1 | `docker compose ps` | `db` healthy, `migrate` Exited (0), `api` healthy |
| 2 | `curl -i http://127.0.0.1:3001/api/health` | `200`, database `up` |
| 3 | `docker compose logs api \| grep -i "config validated"` | one line found |
| 4 | `curl -i http://127.0.0.1:3001/api/docs` | `404` (Swagger is dev-only; it must NOT be exposed) |
| 5 | `docker compose exec api id` | `uid=1000(node)` — not root |
| 6 | `docker compose exec api sh -c "touch /app/x"` | fails: read-only file system |
| 7 | From another machine on your network: `curl http://<your-lan-ip>:3001/api/health` | connection refused (loopback bind) |
| 8 | `docker compose port db 5432` | prints nothing / error — DB is not published |

## Phase 2 — Functional smoke tests (against the container)

Use your frontend at `localhost:3000` (with `NEXT_PUBLIC_API_URL`/equivalent → `http://localhost:3001`) or curl/Postman.

- [ ] Public GET endpoints return data (projects, skills, blog…). Empty arrays are fine on a fresh DB.
- [ ] **Login** as the seeded admin → access token returned, refresh cookie set (`HttpOnly`, `Secure`, `SameSite=Strict`).
- [ ] Authenticated create/update/delete on one resource (e.g. a skill).
- [ ] **Logout**, then reuse the old access token → must be rejected (JTI revocation is in Postgres).
- [ ] Contact form submit → success. Note: in `NODE_ENV=production` the mail service really calls Resend. Use a real `RESEND_API_KEY` or expect an error/log here; outside production it only logs.
- [ ] Turnstile: the example uses Cloudflare's always-pass test secret. For a real check, use your real secret and a real widget token.
- [ ] Rate limiting: hammer a throttled endpoint (e.g. login) with wrong credentials ~20× quickly → expect `429`.
- [ ] CORS: request from a disallowed origin (`curl -H "Origin: http://evil.test" -i .../api/health`) → no `Access-Control-Allow-Origin` header.
- [ ] Body limit: POST a ~300 KB JSON body → `413`.

## Phase 3 — Persistence & resilience (the "does it survive?" tests)

| Test | Steps | Expected |
|---|---|---|
| Container restart | `docker compose restart api` | Data intact, health returns 200 within ~40 s |
| Container deletion | `docker compose down && docker compose up -d` | Data intact (volume survived), migrate re-runs as a no-op |
| DB crash | `docker kill portfolio-db-1`, then `curl .../api/health` | `503`; after `docker compose up -d db` it recovers without restarting `api` |
| Graceful shutdown | `docker compose stop api` and check `docker compose logs api` | Clean shutdown, exit code 0 (not 137). 137 = killed after the 10 s timeout → shutdown hooks not firing |
| Backup/restore | `DOCKER_GUIDE.md` §5, restore into a scratch stack | Row counts match |
| **PC shutdown** | Reboot your machine, start Docker Desktop | `restart: unless-stopped` brings `db` and `api` back automatically |

**Your original question — "will it run if I shut my PC down?"** With this stack: **no**, it runs *on your PC*. That's the point of this phase: validate the image. Staying online 24/7 requires running the same image on someone else's always-on machine (Render, Oracle VM, a VPS) — Phase 5.

## Phase 4 — Security checks

```bash
# Secrets not in the image
docker run --rm --entrypoint sh portfolio-api:local -c 'env | grep -E "JWT|COOKIE|ADMIN|RESEND" || echo "clean"'
#   -> clean (secrets only come from env_file at runtime, never from the image)
docker history --no-trunc portfolio-api:local | grep -iE "secret|password" || echo "clean"

# No dev tooling shipped
docker run --rm --entrypoint sh portfolio-api:local -c 'ls node_modules/.bin | grep -E "^(tsc|jest|eslint|prisma)$" || echo "clean"'

# Vulnerability scan
docker scout quickview portfolio-api:local     # or: trivy image portfolio-api:local
```
Fix or consciously accept anything marked HIGH/CRITICAL that has a fix available. Your CI already runs OSV/CodeQL on the repo; this scans the **OS packages** in the image, which they don't.

## Phase 5 — Moving off your machine (later)

When Phase 1–4 pass, pick a target. Same image, different host:

**Render + Neon (original plan)**
- Render can build straight from this `Dockerfile` (Runtime: Docker) — or keep the native Node runtime. If you choose native Node, fix the `start:prod` path first (see `DOCKER_GUIDE.md` §2 heads-up).
- Use **Neon** for Postgres, not Render's free Postgres (expires after 30 days). Append `?sslmode=require` to `DATABASE_URL`. Do **not** deploy the `migrate` stage as a service — use Render's *Pre-Deploy Command* `npx prisma migrate deploy` (native runtime) or run the migrate image once from your PC against the Neon URL.
- Set `TRUST_PROXY_HOPS=1`, `NODE_ENV=production`, `DATABASE_POOL_SIZE=3`, `FRONTEND_URL=<your real site>`.
- **Cookie gotcha:** refresh cookie is `SameSite=Strict`. Frontend and API must be the same *site* (e.g. `www.you.dev` and `api.you.dev`). A frontend on `you.dev` calling `xyz.onrender.com` will **never** receive the cookie → login appears to work then refresh fails. Attach a custom subdomain to the Render service.
- Then add the `RENDER_DEPLOY_HOOK_URL` secret; your `cd.yml` takes it from there.
- Free tier sleeps after 15 min idle → ~1 min cold start. Cron jobs (2 AM/3 AM) won't run reliably while asleep.

**Oracle Always Free VM (Docker-native)**
- Install Docker, copy `compose.yaml` + `.env.docker`, `docker compose up -d`. Put **Caddy** in front for automatic HTTPS (then `TRUST_PROXY_HOPS=1`, and bind the API to loopback/internal network only).
- ARM VM → the image must be built for `linux/arm64` (`docker buildx build --platform linux/arm64`), or build on the VM itself.
- You own patching, firewall (open only 80/443), and backups. Idle VMs may be reclaimed by Oracle.

## Pass criteria

Phase 1–4 all green, and you've done one successful backup→restore. Only then touch Render/Neon.
