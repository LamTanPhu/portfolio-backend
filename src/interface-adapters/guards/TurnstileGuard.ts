import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import type { Request } from 'express'
import { TurnstileVerifier } from '../../infrastructure/cloudflare/TurnstileVerifier'

// =============================================================================
// TurnstileGuard
// Verifies Cloudflare Turnstile token before any use case executes.
// Placed at interface-adapters layer — use cases stay unaware of HTTP context.
// Applied only on public mutation endpoints (contact form).
// =============================================================================
@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name)

  constructor(private readonly turnstile: TurnstileVerifier) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>()
    const token = (req.body as Record<string, unknown>)?.turnstileToken

    if (typeof token !== 'string' || token.trim() === '') {
      throw new ForbiddenException('Missing Turnstile token')
    }

    const isValid = await this.turnstile.verifyToken(token)

    if (!isValid) {
      // Log failed verifications — useful for detecting bot activity
      this.logger.warn(
        `Turnstile verification failed — IP: ${req.ip ?? 'unknown'}`,
      )
      throw new ForbiddenException('Turnstile verification failed')
    }

    return true
  }
}