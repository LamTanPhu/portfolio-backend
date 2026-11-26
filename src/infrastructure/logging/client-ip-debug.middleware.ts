/**
 * @fileoverview clientIpDebugMiddleware
 *
 * TEMPORARY, OPT-IN diagnostic for TRUST_PROXY_HOPS. Enabled only when
 * DEBUG_CLIENT_IP=true (see main.ts); off by default and meant to be switched
 * on for one deploy, read once, then removed from the environment.
 *
 * Why it exists: behind browser -> Vercel rewrite -> Render the number of proxy
 * hops cannot be derived from code. If TRUST_PROXY_HOPS is too low, req.ip is a
 * PROXY's address, which silently (a) puts every visitor in one rate-limit
 * bucket, (b) stores the wrong IP on contact/resume rows, and (c) can break the
 * UA+IP token fingerprint. Logging what Express actually resolved, next to the
 * raw header chain, shows the right hop count in a single request.
 *
 * It logs the caller's own IP, so it must never stay enabled.
 */

import type { NextFunction, Request, Response } from 'express'

export interface ClientIpDebugLogger {
    warn(message: string): void
}

export function clientIpDebugMiddleware(logger: ClientIpDebugLogger) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const forwardedFor = req.headers['x-forwarded-for']
        logger.warn(
            `[DEBUG_CLIENT_IP] req.ip=${req.ip ?? 'undefined'} ` +
                `req.ips=${JSON.stringify(req.ips)} ` +
                `socket=${req.socket.remoteAddress ?? 'undefined'} ` +
                `x-forwarded-for=${Array.isArray(forwardedFor) ? forwardedFor.join(' | ') : (forwardedFor ?? 'none')}`,
        )
        next()
    }
}
