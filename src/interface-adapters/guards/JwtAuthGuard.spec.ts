/**
 * @fileoverview JwtAuthGuard Unit Tests
 *
 * This guard is the single auth gate in front of every admin-only route in
 * the app, so its branches matter more than most: it decides who gets
 * treated as an authenticated admin. AuthService.verifyAccessToken() already
 * has full branch coverage (revoked / expired / fingerprint mismatch — see
 * AuthService.spec.ts); this suite covers what the guard itself is
 * responsible for and AuthService can't:
 *  - missing / malformed Authorization header → 401, before AuthService is
 *    ever called
 *  - correct Bearer-prefix stripping of the token passed to AuthService
 *  - fingerprint computed from the request's User-Agent + IP and forwarded
 *    unchanged to AuthService
 *  - verified payload attached to req.user on success
 *  - AuthService rejection propagated as UnauthorizedError (domain), and
 *    req.user left untouched
 */

import { ExecutionContext } from '@nestjs/common'
import { JwtAuthGuard, AuthenticatedRequest } from './JwtAuthGuard'
import { AuthService, AccessTokenPayload } from '../../application/services/AuthService'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

// =============================================================================
// Helpers
// =============================================================================

const mockAuthService = { verifyAccessToken: jest.fn() }

function makeCtx(
    headers: Record<string, string> = {},
    ip = '127.0.0.1',
): { ctx: ExecutionContext; req: AuthenticatedRequest } {
    const req = { headers, ip, method: 'GET', url: '/api/blog/admin' } as unknown as AuthenticatedRequest
    const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext
    return { ctx, req }
}

const validPayload: AccessTokenPayload = {
    sub: 1,
    role: 'admin',
    jti: 'jti-123',
    fingerprint: 'irrelevant-here-authservice-owns-fingerprint-matching',
    iss: AuthService.ISSUER,
    aud: AuthService.AUDIENCE,
}

// =============================================================================
// Suite
// =============================================================================

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard

    beforeEach(() => {
        jest.clearAllMocks()
        guard = new JwtAuthGuard(mockAuthService as unknown as AuthService)
    })

    // ---------------------------------------------------------------------------
    // Header presence / shape
    // ---------------------------------------------------------------------------
    describe('Authorization header', () => {
        it('throws UnauthorizedError when the header is missing entirely', async () => {
            const { ctx } = makeCtx({})
            await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError)
            expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled()
        })

        it('throws UnauthorizedError when the header does not start with "Bearer "', async () => {
            const { ctx } = makeCtx({ authorization: 'Basic sometoken' })
            await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError)
            expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled()
        })

        it('throws UnauthorizedError when the header is just "Bearer" with no token', async () => {
            const { ctx } = makeCtx({ authorization: 'Bearer' })
            await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedError)
            expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled()
        })

        it('strips exactly the "Bearer " prefix before passing the token to AuthService', async () => {
            mockAuthService.verifyAccessToken.mockResolvedValue(validPayload)
            const { ctx } = makeCtx({ authorization: 'Bearer abc.def.ghi' })

            await guard.canActivate(ctx)

            expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('abc.def.ghi', expect.any(String))
        })
    })

    // ---------------------------------------------------------------------------
    // Fingerprint derivation
    // ---------------------------------------------------------------------------
    describe('fingerprint', () => {
        it('forwards a fingerprint built from User-Agent + IP, matching AuthService.buildFingerprint', async () => {
            mockAuthService.verifyAccessToken.mockResolvedValue(validPayload)
            const { ctx } = makeCtx({ authorization: 'Bearer tok', 'user-agent': 'TestAgent/1.0' }, '10.0.0.5')

            await guard.canActivate(ctx)

            const expectedFingerprint = AuthService.buildFingerprint('TestAgent/1.0', '10.0.0.5')
            expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('tok', expectedFingerprint)
        })

        it('falls back to an empty-string User-Agent/IP when either is absent, without throwing', async () => {
            mockAuthService.verifyAccessToken.mockResolvedValue(validPayload)
            const req = {
                headers: { authorization: 'Bearer tok' },
                method: 'GET',
                url: '/x',
            } as unknown as AuthenticatedRequest
            const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext

            await expect(guard.canActivate(ctx)).resolves.toBe(true)

            const expectedFingerprint = AuthService.buildFingerprint('', '')
            expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('tok', expectedFingerprint)
        })
    })

    // ---------------------------------------------------------------------------
    // Outcome
    // ---------------------------------------------------------------------------
    describe('verification outcome', () => {
        it('attaches the verified payload to req.user and returns true on success', async () => {
            mockAuthService.verifyAccessToken.mockResolvedValue(validPayload)
            const { ctx, req } = makeCtx({ authorization: 'Bearer tok' })

            const result = await guard.canActivate(ctx)

            expect(result).toBe(true)
            expect(req.user).toEqual(validPayload)
        })

        it('propagates an AuthService rejection as UnauthorizedError with the same message', async () => {
            mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Token has been revoked'))
            const { ctx, req } = makeCtx({ authorization: 'Bearer tok' })

            let caught: UnauthorizedError | undefined
            try {
                await guard.canActivate(ctx)
            } catch (e) {
                caught = e as UnauthorizedError
            }

            expect(caught).toBeInstanceOf(UnauthorizedError)
            expect(caught!.message).toBe('Token has been revoked')
            expect(req.user).toBeUndefined()
        })

        it('falls back to a generic message when AuthService throws a non-Error value', async () => {
            mockAuthService.verifyAccessToken.mockRejectedValue('not an Error instance')
            const { ctx } = makeCtx({ authorization: 'Bearer tok' })

            let caught: UnauthorizedError | undefined
            try {
                await guard.canActivate(ctx)
            } catch (e) {
                caught = e as UnauthorizedError
            }

            expect(caught).toBeInstanceOf(UnauthorizedError)
            expect(caught!.message).toBe('Invalid token')
        })
    })
})
