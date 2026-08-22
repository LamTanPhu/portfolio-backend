/**
 * @fileoverview DomainExceptionFilter
 *
 * Global filter that catches all DomainErrors and maps them to proper HTTP responses.
 * Keeps domain layer completely clean of HTTP concerns.
 *
 * Security policy:
 * - 4xx errors: message is always returned (safe, user-facing)
 * - 5xx errors: message is redacted in production — "Internal server error" only
 * - Stack traces: never exposed in production, always stripped from response
 * - Path included in development only — aids debugging without leaking in prod
 */

import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { DomainError } from '../../domain/errors'

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(DomainExceptionFilter.name)
    private readonly isProduction: boolean

    constructor(private readonly config: ConfigService) {
        // Resolved once at construction time — NODE_ENV never changes at runtime.
        // Using ConfigService keeps this consistent with every other env access in the app.
        this.isProduction = this.config.get<string>('NODE_ENV') === 'production'
    }

    catch(exception: DomainError, host: ArgumentsHost): void {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()

        const { statusCode, message, name, code, stack } = exception
        const method = request.method
        const url = request.url
        const ip = request.ip ?? 'unknown'

        // ─── Logging ──────────────────────────────────────────────────────────────
        if (statusCode === 401 || statusCode === 403) {
            // Auth failures — log with IP for security audit trail
            this.logger.warn(`[${name}] ${message} | IP: ${ip} | ${method} ${url}`)
        } else if (statusCode === 429) {
            // Rate limit — log with IP to spot abuse patterns
            this.logger.warn(`[${name}] Rate limit hit | IP: ${ip} | ${method} ${url}`)
        } else if (statusCode >= 500) {
            // Server errors — full stack in logs always, never in response
            this.logger.error(`[${name}] ${message} | ${method} ${url}`, stack)
        }
        // 400, 404, 409, 422 — no log noise, these are normal client errors

        // ─── Safe Response ────────────────────────────────────────────────────────
        response.status(statusCode).json({
            statusCode,
            error: code,

            // 5xx in production: redact real message — never leak internals
            message: this.isProduction && statusCode >= 500 ? 'Internal server error' : message,

            timestamp: new Date().toISOString(),

            // Development extras — path and stack for easier debugging
            // Strictly excluded in production
            ...(!this.isProduction && {
                path: url,
                stack: stack,
            }),
        })
    }
}
