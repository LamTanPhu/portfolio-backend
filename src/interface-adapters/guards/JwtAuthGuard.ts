import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from '../../application/services/AuthService'

// =============================================================================
// JwtAuthGuard
// Protects admin routes. Validates:
//   1. Token presence and signature
//   2. Token not revoked (logout protection)
//   3. Fingerprint match (stolen token protection)
// Attaches verified payload to request.user for downstream use.
// =============================================================================
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(private readonly authService: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>()

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token')
    }

    const token = authHeader.slice(7) // remove 'Bearer ' prefix

    // Build fingerprint from current request context
    const fingerprint = AuthService.buildFingerprint(
      req.headers['user-agent'] ?? '',
      req.ip ?? '',
    )

    try {
      const payload = await this.authService.verifyAccessToken(token, fingerprint)

      // Attach to request — controllers access via @Req() req.user
      ;(req as any).user = payload

      return true
    } catch (error) {
      this.logger.warn(
        `Auth failed — IP: ${req.ip ?? 'unknown'} — ${(error as Error).message}`,
      )
      throw new UnauthorizedException((error as Error).message)
    }
  }
}