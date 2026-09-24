/**
 * @fileoverview SnakeCaptchaGuard Unit Tests
 *
 * Structurally mirrors TurnstileGuard.spec.ts — same fail-closed design
 * under test, same branch shape — so the two guards are verified the same
 * way. Verifies all branches of the guard:
 *  - missing / empty / non-string snakeProofToken → 400
 *  - invalid proof (verifier returns false) → 400 with specific message
 *  - verifier throws a network/internal error → 400 with generic message
 *  - valid proof → true, token left on the body (guards run before
 *    Nest's ValidationPipe, and SubmitContactDto still requires
 *    snakeProofToken, so stripping it here would fail DTO validation on
 *    an otherwise-valid request)
 *
 * The critical regression case is the DomainError re-throw: the catch
 * block must not swallow the ValidationError raised by the `!isValid`
 * branch and replace it with the generic fallback message.
 *
 * req.ip is exercised both present ('127.0.0.1', the default in makeCtx)
 * and absent (null) across all three warn/error call sites in the guard.
 * Without the absent case, `req.ip ?? 'unknown'` never takes its fallback
 * branch at any of the three sites, which is what held this file's branch
 * coverage at ~78%, below its configured 90% threshold.
 *
 * IMPORTANT: the "absent" sentinel passed to makeCtx must be `null`, not
 * `undefined`. JavaScript's default-parameter substitution triggers on an
 * explicit `undefined` argument exactly the same as an omitted one, so
 * `makeCtx(body, undefined)` silently falls back to '127.0.0.1' instead of
 * producing an absent ip — a real bug that shipped here once already (both
 * the "normal" and "ip absent" variants of a test logged the same
 * IP: 127.0.0.1 in CI, and total branch coverage didn't move at all after
 * adding three new "absent ip" tests). `null` is never substituted by a
 * default parameter, and `req.ip ?? 'unknown'` treats `null` and
 * `undefined` identically, so it exercises the intended fallback branch.
 */

import { ExecutionContext } from '@nestjs/common'
import { SnakeCaptchaGuard } from './SnakeCaptchaGuard'
import { ValidationError } from '../../domain/errors/ValidationError'

// =============================================================================
// Helpers
// =============================================================================

const mockSnakeCaptcha = {
    issueChallenge: jest.fn(),
    verifyCompletion: jest.fn(),
    verifyProof: jest.fn(),
}

function makeCtx(body: Record<string, unknown> = {}, ip: string | null = '127.0.0.1'): ExecutionContext {
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
        guard = new SnakeCaptchaGuard(mockSnakeCaptcha)
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

        it('rejects a missing token even when req.ip is absent (exercises the "unknown" IP fallback)', async () => {
            await expect(guard.canActivate(makeCtx({}, null))).rejects.toThrow(ValidationError)
        })
    })

    // ---------------------------------------------------------------------------
    // Verification outcome
    // ---------------------------------------------------------------------------
    describe('verification', () => {
        it('returns true and leaves the token on the body when verification succeeds', async () => {
            // Left in place on purpose: guards run before ValidationPipe, and
            // SubmitContactDto still requires snakeProofToken, so stripping it
            // here would fail DTO validation on an otherwise-valid request.
            mockSnakeCaptcha.verifyProof.mockResolvedValue(true)
            const body = { snakeProofToken: 'valid-proof', name: 'Alice' }
            const ctx = makeCtx(body)

            const result = await guard.canActivate(ctx)

            expect(result).toBe(true)
            expect(body).toHaveProperty('snakeProofToken', 'valid-proof')
            expect(body).toHaveProperty('name', 'Alice') // other fields untouched
        })

        it('passes the trimmed token value to the verifier', async () => {
            mockSnakeCaptcha.verifyProof.mockResolvedValue(true)
            await guard.canActivate(makeCtx({ snakeProofToken: '  abc123  ' }))

            expect(mockSnakeCaptcha.verifyProof).toHaveBeenCalledWith('abc123')
        })

        // -------------------------------------------------------------------------
        // Regression: DomainError re-throw — the specific message must survive
        // -------------------------------------------------------------------------
        it('preserves the specific ValidationError message when verifier returns false', async () => {
            mockSnakeCaptcha.verifyProof.mockResolvedValue(false)

            let caught: ValidationError | undefined
            try {
                await guard.canActivate(makeCtx({ snakeProofToken: 'bad-proof' }))
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            // Must be the specific user-facing message, NOT the generic fallback
            expect(caught!.message).toBe('Snake captcha verification failed. Please play the game again.')
        })

        it('rejects an invalid proof even when req.ip is absent (exercises the "unknown" IP fallback)', async () => {
            mockSnakeCaptcha.verifyProof.mockResolvedValue(false)

            await expect(guard.canActivate(makeCtx({ snakeProofToken: 'bad-proof' }, null))).rejects.toThrow(
                ValidationError,
            )
        })

        it('throws a generic ValidationError when verifier throws an unexpected error', async () => {
            mockSnakeCaptcha.verifyProof.mockRejectedValue(new Error('cache unavailable'))

            let caught: ValidationError | undefined
            try {
                await guard.canActivate(makeCtx({ snakeProofToken: 'some-proof' }))
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            expect(caught!.message).toBe('Snake captcha verification failed')
        })

        it('surfaces an unexpected error even when req.ip is absent (exercises the "unknown" IP fallback)', async () => {
            mockSnakeCaptcha.verifyProof.mockRejectedValue(new Error('cache unavailable'))

            await expect(guard.canActivate(makeCtx({ snakeProofToken: 'some-proof' }, null))).rejects.toThrow(
                ValidationError,
            )
        })
    })
})
