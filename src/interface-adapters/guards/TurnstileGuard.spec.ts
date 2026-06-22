/**
 * @fileoverview TurnstileGuard Unit Tests
 *
 * Verifies all branches of the guard:
 *  - missing / empty token → 400
 *  - invalid token (verifier returns false) → 400 with specific message
 *  - verifier throws a network/internal error → 400 with generic message
 *  - valid token → true, token stripped from body
 *
 * The critical regression case is the HttpException re-throw: the catch block
 * must not swallow the BadRequestException raised by the `!isValid` branch and
 * replace it with the generic fallback message.
 */

import { ExecutionContext, BadRequestException } from '@nestjs/common'
import { TurnstileGuard } from './TurnstileGuard'

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
        it('throws BadRequestException when turnstileToken is missing', async () => {
            await expect(guard.canActivate(makeCtx({}))).rejects.toThrow(BadRequestException)
        })

        it('throws BadRequestException when turnstileToken is an empty string', async () => {
            await expect(
                guard.canActivate(makeCtx({ turnstileToken: '   ' }))
            ).rejects.toThrow(BadRequestException)
        })

        it('throws BadRequestException when turnstileToken is not a string', async () => {
            await expect(
                guard.canActivate(makeCtx({ turnstileToken: 42 }))
            ).rejects.toThrow(BadRequestException)
        })
    })

    // ---------------------------------------------------------------------------
    // Verification outcome
    // ---------------------------------------------------------------------------
    describe('verification', () => {
        it('returns true and strips token from body when verification succeeds', async () => {
            mockVerifier.verifyToken.mockResolvedValue(true)
            const body = { turnstileToken: 'valid-token', name: 'Alice' }
            const ctx = makeCtx(body)

            const result = await guard.canActivate(ctx)

            expect(result).toBe(true)
            expect(body).not.toHaveProperty('turnstileToken')
            expect(body).toHaveProperty('name', 'Alice') // other fields untouched
        })

        it('passes the trimmed token value to the verifier', async () => {
            mockVerifier.verifyToken.mockResolvedValue(true)
            await guard.canActivate(makeCtx({ turnstileToken: '  abc123  ' }))

            expect(mockVerifier.verifyToken).toHaveBeenCalledWith('abc123')
        })

        // -------------------------------------------------------------------------
        // Regression: HttpException re-throw — the specific message must survive
        // -------------------------------------------------------------------------
        it('preserves the specific BadRequestException message when verifier returns false', async () => {
            mockVerifier.verifyToken.mockResolvedValue(false)

            let caught: BadRequestException | undefined
            try {
                await guard.canActivate(makeCtx({ turnstileToken: 'bad-token' }))
            } catch (e) {
                caught = e as BadRequestException
            }

            expect(caught).toBeInstanceOf(BadRequestException)
            // Must be the specific user-facing message, NOT the generic fallback
            const response = caught!.getResponse() as { message: string }
            expect(response.message).toBe('Turnstile verification failed. Please try again.')
        })

        it('throws a generic BadRequestException when verifier throws an unexpected error', async () => {
            mockVerifier.verifyToken.mockRejectedValue(new Error('network timeout'))

            let caught: BadRequestException | undefined
            try {
                await guard.canActivate(makeCtx({ turnstileToken: 'some-token' }))
            } catch (e) {
                caught = e as BadRequestException
            }

            expect(caught).toBeInstanceOf(BadRequestException)
            const response = caught!.getResponse() as { message: string }
            expect(response.message).toBe('Turnstile verification failed')
        })
    })
})