/**
 * @fileoverview StubTurnstileVerifier
 *
 * Test double for ITurnstileVerifier — wired into the test app via
 * createTestApp()'s overrideProvider so contact.e2e-spec.ts never makes a
 * real network call to Cloudflare. Any non-empty token is accepted except
 * the sentinel value below, which lets tests exercise TurnstileGuard's
 * rejection path deterministically without depending on an external service.
 */

import type { ITurnstileVerifier } from '../../src/application/ports/ITurnstileVerifier'

export const INVALID_TURNSTILE_TOKEN = '__e2e_invalid_turnstile_token__'

export class StubTurnstileVerifier implements ITurnstileVerifier {
    verifyToken(token: string): Promise<boolean> {
        return Promise.resolve(token !== INVALID_TURNSTILE_TOKEN)
    }
}
