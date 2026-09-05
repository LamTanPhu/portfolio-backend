/**
 * @fileoverview AuditLogInterceptor
 *
 * Global interceptor — registered once via APP_INTERCEPTOR in AppModule,
 * not decorated onto every admin controller method individually. Runs on
 * every request, but is a no-op for anything that isn't an authenticated
 * mutating admin call, so the cost on public GET traffic is a few cheap
 * checks, not a DB write.
 *
 * Guards run before interceptors in Nest's request lifecycle, so by the
 * time this runs, JwtAuthGuard has already populated req.user for any
 * route that required it. Routes with no guard simply have no req.user —
 * that's the signal this interceptor uses to skip public traffic.
 *
 * Only logs on SUCCESS (tap, not catchError). Failed auth attempts and
 * validation errors are already logged elsewhere (JwtAuthGuard.warn,
 * DomainExceptionFilter) — duplicating them here would just be noise in
 * a log whose entire value is "what did the admin actually change."
 *
 * entityId resolution: PATCH/DELETE routes carry the id (or slug) in the
 * URL itself (req.params), which is preferred when present since it's
 * always correct regardless of what the handler returns. POST (create)
 * routes have no :id in the URL at all — the id only exists once the
 * handler's response body comes back — so that's the fallback, read from
 * the tap() payload rather than req.params.
 *
 * Fire-and-forget by design: an audit write failing must never surface as
 * a failure of the admin action itself. Logged via ILogger, swallowed.
 */

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common'
import type { Request, Response } from 'express'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

import type { IAuditLogWriteRepository } from '../../domain/repositories/audit/IAuditLogWriteRepository'
import type { ILogger } from '../../application/ports/ILogger'
import type { AuthenticatedRequest } from '../guards/JwtAuthGuard'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(
        @Inject('IAuditLogWriteRepository')
        private readonly auditLogRepo: IAuditLogWriteRepository,

        @Inject('ILogger')
        private readonly logger: ILogger,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest<Request>()

        // Skip entirely for public reads and any non-mutating method —
        // most of the app's traffic never reaches the repo call below.
        if (!MUTATING_METHODS.has(req.method)) {
            return next.handle()
        }

        // Controller class name minus the "Controller" suffix — e.g. BlogController
        // → "Blog". Computed once per request, before the handler runs, from the
        // ExecutionContext — not parsed from the URL. Nested routes like
        // /api/about/skills/:id would otherwise need per-route path guessing;
        // the controller class is exact and free.
        const entityType = context.getClass().name.replace(/Controller$/, '')

        return next.handle().pipe(
            tap((body: unknown) => {
                const authedReq = req as AuthenticatedRequest

                // No req.user = route had no JwtAuthGuard = not an admin action.
                // (Public mutating routes exist — e.g. POST /contact — and are
                // intentionally not audited; they're covered by their own
                // spam/rate-limit protections, not this log.)
                if (!authedReq.user) return

                const res = context.switchToHttp().getResponse<Response>()

                void this.write(authedReq, entityType, res.statusCode, body)
            }),
        )
    }

    private async write(
        req: AuthenticatedRequest,
        entityType: string,
        statusCode: number,
        body: unknown,
    ): Promise<void> {
        try {
            await this.auditLogRepo.save({
                actorId: req.user.sub,
                method: req.method,
                route: req.originalUrl.split('?')[0],
                entityType,
                entityId: this.resolveEntityId(req, body),
                ipAddress: req.ip ?? null,
                statusCode,
            })
        } catch (error) {
            // Never let an audit write failure look like the admin action failed —
            // it already succeeded by the time we get here. Just log and move on.
            this.logger.error(
                `Audit log write failed for ${req.method} ${req.originalUrl}`,
                (error as Error).stack,
                AuditLogInterceptor.name,
            )
        }
    }

    /**
     * Prefers the URL param (PATCH/DELETE — always present, always correct).
     * Falls back to the response body (POST/create — the only place the new
     * entity's id exists, since the URL never had one).
     */
    private resolveEntityId(req: AuthenticatedRequest, body: unknown): string | null {
        const fromParams = req.params?.id ?? req.params?.slug
        if (fromParams != null) return String(fromParams)

        if (body && typeof body === 'object') {
            const { id, slug } = body as { id?: unknown; slug?: unknown }
            const fromBody = id ?? slug
            if (typeof fromBody === 'string' || typeof fromBody === 'number') {
                return String(fromBody)
            }
        }

        return null
    }
}
