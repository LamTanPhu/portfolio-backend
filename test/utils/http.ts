/**
 * @fileoverview e2e HTTP helpers
 *
 * Every request in the suite should go through api(app) so the User-Agent
 * header stays constant across calls. AuthService.buildFingerprint() hashes
 * `${userAgent}:${ip}` — a login and a later authenticated request sent
 * with different User-Agent strings would fail fingerprint validation
 * (JwtAuthGuard.canActivate / AuthService.refresh) even with an otherwise
 * perfectly valid token. supertest/superagent don't guarantee a stable
 * default User-Agent across requests, so this pins one explicitly rather
 * than relying on that.
 */

import type { INestApplication } from '@nestjs/common'
import type { Server } from 'http'
import request from 'supertest'

export const E2E_USER_AGENT = 'portfolio-e2e-suite/1.0'

export function api(app: INestApplication<Server>) {
    const server = app.getHttpServer()

    return {
        get: (path: string) => request(server).get(path).set('User-Agent', E2E_USER_AGENT),
        post: (path: string) => request(server).post(path).set('User-Agent', E2E_USER_AGENT),
        patch: (path: string) => request(server).patch(path).set('User-Agent', E2E_USER_AGENT),
        delete: (path: string) => request(server).delete(path).set('User-Agent', E2E_USER_AGENT),
    }
}

export function authHeader(token: string): [string, string] {
    return ['Authorization', `Bearer ${token}`]
}

/**
 * supertest/superagent types res.headers loosely enough that reading
 * 'set-cookie' straight off it propagates as `any` through anything you do
 * next. Funneling it through `unknown` and narrowing by hand here is what
 * actually satisfies @typescript-eslint/no-unsafe-* — not a cast.
 */
export function extractSetCookies(res: request.Response): string[] {
    const raw: unknown = res.headers['set-cookie']
    if (Array.isArray(raw)) {
        return raw.filter((c): c is string => typeof c === 'string')
    }
    return typeof raw === 'string' ? [raw] : []
}

/** Finds a specific cookie by name and strips it down to `name=value`,
 * discarding Set-Cookie attributes (Path, HttpOnly, SameSite, Max-Age...) —
 * exactly what the next request's Cookie header should contain. */
export function findCookie(res: request.Response, cookieName: string): string | undefined {
    const match = extractSetCookies(res).find((c) => c.startsWith(`${cookieName}=`))
    return match?.split(';')[0]
}
