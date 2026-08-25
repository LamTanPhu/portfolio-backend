/**
 * @fileoverview JwtAuthGuard
 *
 * Protects all admin-only routes.
 * Full validation chain:
 *   1. Bearer token presence
 *   2. JWT signature + expiry validation
 *   3. Token revocation check (via cache + DB)
 *   4. Device fingerprint validation (anti-theft)
 *
 * Attaches verified payload to `req.user` for downstream use.
 */

import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'

import type { AccessTokenPayload } from '../../application/services/AuthService'
import { AuthService } from '../../application/services/AuthService'

export interface AuthenticatedRequest extends Request {
    user: AccessTokenPayload
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name)

    constructor(private readonly authService: AuthService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()

        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            this.logger.warn(`Missing Bearer token | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
            throw new UnauthorizedException('Missing authorization token')
        }

        const token = authHeader.slice(7) // Remove "Bearer "

        // Compute once, reuse
        const fingerprint = AuthService.buildFingerprint(req.headers['user-agent'] ?? '', req.ip ?? '')

        try {
            const payload = await this.authService.verifyAccessToken(token, fingerprint)

            // Attach verified payload to request
            req.user = payload

            return true
        } catch (error) {
            const message = error instanceof Error && error.message ? error.message : 'Invalid token'
            this.logger.warn(
                `Authentication failed | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url} | ${message}`,
            )
            throw new UnauthorizedException(message)
        }
    }
}
