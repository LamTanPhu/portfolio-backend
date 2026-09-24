/**
 * @fileoverview StubSnakeCaptchaVerifier
 *
 * Test double for ISnakeCaptchaVerifier — wired into the test app via
 * createTestApp()'s overrideProvider so e2e tests never have to actually
 * play the snake game (issue a challenge, simulate a win, verify
 * completion) just to get a valid snakeProofToken for /contact. Mirrors
 * StubTurnstileVerifier's pattern exactly: any non-empty token is accepted
 * except the sentinel value below, which lets tests exercise
 * SnakeCaptchaGuard's rejection path deterministically.
 *
 * verifyCompletion() intentionally declares no parameters — TypeScript
 * permits a method implementation to take fewer parameters than its
 * interface signature (the same rule that lets `arr.map(x => x)` skip
 * `index`/`array`), so there's no unused SnakeCompletionInput param or
 * import to carry here.
 */

import type { ISnakeCaptchaVerifier } from '../../src/application/ports/ISnakeCaptchaVerifier'

export const INVALID_SNAKE_PROOF_TOKEN = '__e2e_invalid_snake_proof_token__'
export const STUB_SNAKE_CHALLENGE_ID = '__e2e_stub_snake_challenge__'
export const STUB_SNAKE_PROOF_TOKEN = '__e2e_stub_snake_proof_token__'

export class StubSnakeCaptchaVerifier implements ISnakeCaptchaVerifier {
    issueChallenge(): Promise<string> {
        return Promise.resolve(STUB_SNAKE_CHALLENGE_ID)
    }

    verifyCompletion(): Promise<string | null> {
        return Promise.resolve(STUB_SNAKE_PROOF_TOKEN)
    }

    verifyProof(token: string): Promise<boolean> {
        return Promise.resolve(token !== INVALID_SNAKE_PROOF_TOKEN)
    }
}
