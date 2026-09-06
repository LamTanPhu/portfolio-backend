/**
 * @fileoverview TurnstileGuard Unit Tests
 *
 * Verifies all branches of the guard:
 *  - missing / empty token → 400
 *  - invalid token (verifier returns false) → 400 with specific message
 *  - verifier throws a network/internal error → 400 with generic message
 *  - valid token → true, token left on the body (see below)
 *
 * The critical regression case is the DomainError re-throw: the catch block
 * must not swallow the ValidationError raised by the `!isValid` branch and
 * replace it with the generic fallback message.
 *
 * turnstileToken is deliberately NOT stripped from the body on success — see
 * TurnstileGuard's own comment on this: guards run before Nest's
 * ValidationPipe, and SubmitContactDto still declares turnstileToken as a
 * required field, so removing it here would fail an otherwise valid request
 * at the DTO-validation stage with a 400. This was previously asserted the
 * other way; that assertion described a stripping behavior the guard does
 * not (and must not) implement.
 */

import { ExecutionContext } from '@nestjs/common'
import { TurnstileGuard } from './TurnstileGuard'
import { ValidationError } from '../../domain/errors/ValidationError'

// =============================================================================
// Helpers
// =============================================================================

const mockVerifier = { verifyToken: jest.fn() }

function makeCtx(body: Record<string, unknown> = {}, ip = '127.0.0.1'): ExecutionContext {
    const req = { body, ip, method: 'POST', url: '/api/contact', headers: {} }
    return {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext
}

// =============================================================================
// Suite
// =============================================================================

describe('TurnstileGuard', () => {
    let guard: TurnstileGuard

    beforeEach(() => {
        jest.clearAllMocks()
        guard = new TurnstileGuard(mockVerifier)
    })

    // ---------------------------------------------------------------------------
    // Token presence checks
    // ---------------------------------------------------------------------------
    describe('token presence', () => {
        it('throws ValidationError when turnstileToken is missing', async () => {
            await expect(guard.canActivate(makeCtx({}))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError when turnstileToken is an empty string', async () => {
            await expect(guard.canActivate(makeCtx({ turnstileToken: '   ' }))).rejects.toThrow(ValidationError)
        })

        it('throws ValidationError when turnstileToken is not a string', async () => {
            await expect(guard.canActivate(makeCtx({ turnstileToken: 42 }))).rejects.toThrow(ValidationError)
        })
    })

    // ---------------------------------------------------------------------------
    // Verification outcome
    // ---------------------------------------------------------------------------
    describe('verification', () => {
        it('returns true and leaves the token on the body when verification succeeds', async () => {
            // Left in place on purpose: guards run before ValidationPipe, and
            // SubmitContactDto still requires turnstileToken, so stripping it
            // here would fail DTO validation on an otherwise-valid request.
            mockVerifier.verifyToken.mockResolvedValue(true)
            const body = { turnstileToken: 'valid-token', name: 'Alice' }
            const ctx = makeCtx(body)

            const result = await guard.canActivate(ctx)

            expect(result).toBe(true)
            expect(body).toHaveProperty('turnstileToken', 'valid-token')
            expect(body).toHaveProperty('name', 'Alice') // other fields untouched
        })

        it('passes the trimmed token value to the verifier', async () => {
            mockVerifier.verifyToken.mockResolvedValue(true)
            await guard.canActivate(makeCtx({ turnstileToken: '  abc123  ' }))

            expect(mockVerifier.verifyToken).toHaveBeenCalledWith('abc123')
        })

        // -------------------------------------------------------------------------
        // Regression: DomainError re-throw — the specific message must survive
        // -------------------------------------------------------------------------
        it('preserves the specific ValidationError message when verifier returns false', async () => {
            mockVerifier.verifyToken.mockResolvedValue(false)

            let caught: ValidationError | undefined
            try {
                await guard.canActivate(makeCtx({ turnstileToken: 'bad-token' }))
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            // Must be the specific user-facing message, NOT the generic fallback
            expect(caught!.message).toBe('Turnstile verification failed. Please try again.')
        })

        it('throws a generic ValidationError when verifier throws an unexpected error', async () => {
            mockVerifier.verifyToken.mockRejectedValue(new Error('network timeout'))

            let caught: ValidationError | undefined
            try {
                await guard.canActivate(makeCtx({ turnstileToken: 'some-token' }))
            } catch (e) {
                caught = e as ValidationError
            }

            expect(caught).toBeInstanceOf(ValidationError)
            expect(caught!.message).toBe('Turnstile verification failed')
        })
    })
})
