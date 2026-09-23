/**
 * @fileoverview SnakeCaptchaGuard Unit Tests
 *
 * Structurally mirrors TurnstileGuard.spec.ts — same branches matter here:
 *  - missing / empty token → 400
 *  - invalid token (verifier returns false) → 400 with specific message
 *  - verifier throws a network/internal error → 400 with generic message
 *  - valid token → true, token left on the body (guards run before
 *    ValidationPipe, and SubmitContactDto still requires snakeProofToken)
 */

import { ExecutionContext } from '@nestjs/common'
import { SnakeCaptchaGuard } from './SnakeCaptchaGuard'
import { ValidationError } from '../../domain/errors/ValidationError'

// =============================================================================
// Helpers
// =============================================================================

const mockVerifier = { verifyProof: jest.fn(), issueChallenge: jest.fn(), verifyCompletion: jest.fn() }

function makeCtx(body: Record<string, unknown> = {}, ip = '127.0.0.1'): ExecutionContext {
    const req = { body, ip, method: 'POST', url: '/api/contact', headers: {} }
    return {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext
}

// =============================================================================
// Suite
// =============================================================================

describe('SnakeCaptchaGuard', () => {
    let guard: SnakeCaptchaGuard

    beforeEach(() => {
        jest.clearAllMocks()
        guard = new SnakeCaptchaGuard(mockVerifier)
    })

    // ---------------------------------------------------------------------------
    // Token presence checks
    // ---------------------------------------------------------------------------
    describe('token presence', () => {
        it('throws ValidationError when snakeProofToken is missing', async () => {
            await expect(guard.canActivate(makeCtx({}))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError when snakeProofToken is an empty string', async () => {
            await expect(guard.canActivate(makeCtx({ snakeProofToken: '   ' }))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError when snakeProofToken is not a string', async () => {
            await expect(guard.canActivate(makeCtx({ snakeProofToken: 42 }))).rejects.toThrow(ValidationError)
        })
    })

    // ---------------------------------------------------------------------------
    // Verification outcome
    // ---------------------------------------------------------------------------
    describe('verification', () => {
        it('returns true and leaves the token on the body when verification succeeds', async () => {
            mockVerifier.verifyProof.mockResolvedValue(true)
            const body = { snakeProofToken: 'valid-proof', name: 'Alice' }
            const ctx = makeCtx(body)

            const result = await guard.canActivate(ctx)

            expect(result).toBe(true)
            expect(body).toHaveProperty('snakeProofToken', 'valid-proof')
            expect(body).toHaveProperty('name', 'Alice')
        })

        it('passes the trimmed token value to the verifier', async () => {
            mockVerifier.verifyProof.mockResolvedValue(true)
            await guard.canActivate(makeCtx({ snakeProofToken: '  abc123  ' }))

            expect(mockVerifier.verifyProof).toHaveBeenCalledWith('abc123')
        })

        // -------------------------------------------------------------------------
        // DomainError re-throw — the specific message must survive
        // -------------------------------------------------------------------------
        it('preserves the specific ValidationError message when verifier returns false', async () => {
            mockVerifier.verifyProof.mockResolvedValue(false)

            let caught: ValidationError | undefined
            try {
                await guard.canActivate(makeCtx({ snakeProofToken: 'bad-proof' }))
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            expect(caught!.message).toBe('Snake captcha verification failed. Please play the game again.')
        })

        it('throws a generic ValidationError when verifier throws an unexpected error', async () => {
            mockVerifier.verifyProof.mockRejectedValue(new Error('cache unavailable'))

            let caught: ValidationError | undefined
            try {
                await guard.canActivate(makeCtx({ snakeProofToken: 'some-proof' }))
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            expect(caught!.message).toBe('Snake captcha verification failed')
        })
    })
})
