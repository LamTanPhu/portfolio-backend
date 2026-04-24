import { Injectable, Logger } from '@nestjs/common'
import type { ITurnstileVerifier } from '../../application/ports/ITurnstileVerifier'

// =============================================================================
// Cloudflare Turnstile API response shape
// =============================================================================
interface TurnstileVerifyResponse {
  success:    boolean
  'error-codes'?: string[]
}

// =============================================================================
// TurnstileVerifier
// Implements ITurnstileVerifier — verifies Cloudflare Turnstile tokens.
// secretKey read at call time — picks up env changes without restart.
// Logs failed verifications with error codes for bot pattern analysis.
// Never throws on Cloudflare API failure — returns false instead.
// =============================================================================
@Injectable()
export class TurnstileVerifier implements ITurnstileVerifier {
  private readonly logger = new Logger(TurnstileVerifier.name)

  async verifyToken(token: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY ?? ''

    if (!secretKey) {
      this.logger.warn('TURNSTILE_SECRET_KEY not configured — verification skipped')
      return false
    }

    try {
      const res = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ secret: secretKey, response: token }),
        },
      )

      if (!res.ok) {
        this.logger.error(`Turnstile API returned ${res.status}`)
        return false
      }

      const data = await res.json() as TurnstileVerifyResponse

      if (!data.success && data['error-codes']?.length) {
        this.logger.warn(`Turnstile error codes: ${data['error-codes'].join(', ')}`)
      }

      return data.success
    } catch (error) {
      // Never throw — Cloudflare API failure must not crash contact form
      this.logger.error(
        `Turnstile verification request failed: ${(error as Error).message}`,
      )
      return false
    }
  }
}