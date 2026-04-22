import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from '../../application/services/AuthService'
import type { AccessTokenPayload } from '../../application/services/AuthService'

// =============================================================================
// AuthenticatedRequest
// Extends Express Request with typed user payload.
// Used by controllers to access verified JWT claims — no casting needed.
// =============================================================================
export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload
}

// =============================================================================
// JwtAuthGuard
// Protects admin routes. Validates:
//   1. Token presence and valid Bearer format
//   2. JWT signature and expiry
//   3. Token not revoked — logout protection via DB blacklist
//   4. Fingerprint match — stolen token from different device rejected
// Attaches verified AccessTokenPayload to request.user for downstream use.
// =============================================================================
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(private readonly authService: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token')
    }

    // Remove 'Bearer ' prefix — slice is O(1), no regex needed
    const token = authHeader.slice(7)

    // Build fingerprint from current request context
    // Ties token to the browser/device that originally logged in
    const fingerprint = AuthService.buildFingerprint(
      req.headers['user-agent'] ?? '',
      req.ip ?? '',
    )

    try {
      const payload = await this.authService.verifyAccessToken(token, fingerprint)

      // Attach typed payload — controllers access req.user.sub, req.user.jti etc.
      req.user = payload

      return true
    } catch (error) {
      this.logger.warn(
        `Auth failed — IP: ${req.ip ?? 'unknown'} — ${(error as Error).message}`,
      )
      throw new UnauthorizedException((error as Error).message)
    }
  }
}