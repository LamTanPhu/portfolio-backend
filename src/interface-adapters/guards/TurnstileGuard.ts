/**
 * @fileoverview TurnstileGuard
 * 
 * Protects public mutation endpoints (mainly Contact form) against spam and bots
 * using Cloudflare Turnstile verification.
 * 
 * Fail-closed design: any verification failure results in rejection.
 * Placed in Interface Adapters layer — use cases remain unaware of anti-bot mechanisms.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common'
import type { Request } from 'express'

import type { ITurnstileVerifier } from '../../application/ports/ITurnstileVerifier'

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name)

  constructor(
    @Inject('ITurnstileVerifier')
    private readonly turnstile: ITurnstileVerifier,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>()
    const token = req.body?.turnstileToken as string | undefined

    if (typeof token !== 'string' || token.trim().length === 0) {
      this.logger.warn(`Missing Turnstile token | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
      throw new BadRequestException('Turnstile token is required')
    }

    try {
      const isValid = await this.turnstile.verifyToken(token.trim())

      if (!isValid) {
        this.logger.warn(`Invalid Turnstile token | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
        throw new BadRequestException('Turnstile verification failed. Please try again.')
      }

      // Clean up token from body after successful verification
      delete req.body.turnstileToken

      return true
    } catch (error) {
      this.logger.error(`Turnstile verification error | IP: ${req.ip ?? 'unknown'}`, error)
      throw new BadRequestException('Turnstile verification failed')
    }
  }
}