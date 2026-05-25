/**
 * @fileoverview TurnstileVerifier
 * 
 * Concrete implementation of ITurnstileVerifier.
 * Verifies Cloudflare Turnstile tokens to protect against bots and spam.
 * Fail-closed design: any failure results in rejection.
 */

import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ITurnstileVerifier } from '../../application/ports/ITurnstileVerifier'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

@Injectable()
export class TurnstileVerifier implements ITurnstileVerifier {
  private readonly logger = new Logger(TurnstileVerifier.name)

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async verifyToken(token: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY')

    if (!secretKey) {
      this.logger.warn('TURNSTILE_SECRET_KEY is not configured — skipping verification')
      return false // Fail closed in production
    }

    if (!token?.trim()) {
      this.logger.warn('Empty Turnstile token received')
      return false
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: secretKey,
            response: token.trim(),
          }),
          signal: controller.signal,
        },
      )

      clearTimeout(timeout)

      if (!response.ok) {
        this.logger.error(`Turnstile API returned status ${response.status}`)
        return false
      }

      const data = (await response.json()) as TurnstileVerifyResponse

      if (!data.success && data['error-codes']?.length) {
        this.logger.warn(`Turnstile failed with codes: ${data['error-codes'].join(', ')}`)
      }

      return data.success === true
    } catch (error) {
      this.logger.error(`Turnstile verification request failed`, error)
      return false // Fail closed
    }
  }
}