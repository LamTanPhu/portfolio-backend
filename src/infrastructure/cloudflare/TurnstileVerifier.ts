import { Injectable } from '@nestjs/common'
import { ITurnstileVerifier } from '../../application/ports/ITurnstileVerifier'

@Injectable()
export class TurnstileVerifier implements ITurnstileVerifier {
  private readonly secretKey = process.env.TURNSTILE_SECRET_KEY ?? ''

  async verifyToken(token: string): Promise<boolean> {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: this.secretKey, response: token }),
    })
    const data = await res.json() as { success: boolean }
    return data.success
  }
}
