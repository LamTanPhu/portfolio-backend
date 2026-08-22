/**
 * @fileoverview ConfigValidationService
 *
 * Validates all required environment variables at application startup.
 * Fail-fast approach: if critical config is missing or invalid, the app crashes immediately
 * with a clear error message — prevents silent failures in production.
 */

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ConfigValidationService {
    private readonly logger = new Logger(ConfigValidationService.name)

    constructor(private readonly configService: ConfigService) {}

    validate(): void {
        const errors: string[] = []

        // ─── Required Configuration ─────────────────────────────────────
        this.validateRequired('JWT_SECRET', errors)
        this.validateRequired('ADMIN_EMAIL', errors)
        this.validateRequired('ADMIN_PASSWORD', errors)
        this.validateRequired('COOKIE_SECRET', errors)

        // ─── Database ───────────────────────────────────────────────────
        this.validateRequired('DATABASE_URL', errors)

        // ─── Cache ──────────────────────────────────────────────────────
        // REDIS_URL is genuinely optional, not "not wired up yet" — unset is
        // a fully supported mode (in-memory only), not a degraded one, so
        // this doesn't even warrant a startup warning the way FRONTEND_URL
        // below does. See cache-store.factory.ts for the fallback behavior.

        // ─── Anti-Bot (Turnstile) ───────────────────────────────────────
        this.validateRequired('TURNSTILE_SECRET_KEY', errors)

        // ─── Email (Resend) ─────────────────────────────────────────────
        this.validateRequired('RESEND_API_KEY', errors)

        // ─── Optional but Recommended ───────────────────────────────────
        const frontendUrl = this.configService.get<string>('FRONTEND_URL')
        if (!frontendUrl) {
            this.logger.warn('FRONTEND_URL is not set — CORS may be too permissive')
        }

        if (errors.length > 0) {
            const message = `Configuration validation failed:\n${errors.join('\n')}`
            this.logger.error(message)
            throw new Error(message)
        }

        this.logger.log('All required configuration validated successfully')
    }

    private validateRequired(key: string, errors: string[]): void {
        const value = this.configService.get<string>(key)
        if (!value || value.trim() === '') {
            errors.push(`Missing or empty required environment variable: ${key}`)
        }
    }
}
