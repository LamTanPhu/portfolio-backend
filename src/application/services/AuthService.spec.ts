/**
 * @fileoverview AuthService Unit Tests
 *
 * Tests core auth logic in isolation.
 * All external dependencies (JwtService, ITokenRepository, ICacheQueryService)
 * are mocked — no database, no Redis, no network calls.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './AuthService'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

// =============================================================================
// Mocks
// =============================================================================

const mockJwtService = {
    signAsync:   jest.fn(),
    verifyAsync: jest.fn(),
}

const mockTokenRepo = {
    revoke:    jest.fn(),
    isRevoked: jest.fn(),
}

const mockCacheQuery = {
    getOrSetWithProfile: jest.fn(),
}

// =============================================================================
// Helpers
// =============================================================================

const makeAccessPayload = (overrides = {}) => ({
    sub:         1,
    role:        'admin' as const,
    jti:         'test-jti',
    fingerprint: 'test-fingerprint',
    iss:         'portfolio-api',
    aud:         'portfolio-admin',
    ...overrides,
})

// =============================================================================
// Suite
// =============================================================================

describe('AuthService', () => {
    let service: AuthService

    beforeEach(async () => {
        jest.clearAllMocks()

        mockCacheQuery.getOrSetWithProfile.mockResolvedValue(false)
        mockTokenRepo.isRevoked.mockResolvedValue(false)
        mockJwtService.signAsync.mockResolvedValue('signed-token')

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService,           useValue: mockJwtService },
                { provide: 'ITokenRepository',   useValue: mockTokenRepo  },
                { provide: 'ICacheQueryService', useValue: mockCacheQuery },
            ],
        }).compile()

        service = module.get<AuthService>(AuthService)
        process.env.ADMIN_PASSWORD = 'correct-password'
    })

    afterEach(() => {
        delete process.env.ADMIN_PASSWORD
        delete process.env.FINGERPRINT_STRICT
    })

    // ===========================================================================
    // onModuleInit()
    // ===========================================================================
    describe('onModuleInit()', () => {
        it('calls jwt.signAsync to warm up JIT on init', async () => {
            await service.onModuleInit()

            expect(mockJwtService.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({ warmup: true }),
                expect.objectContaining({ expiresIn: '1s' }),
            )
        })

        it('completes without throwing', async () => {
            await expect(service.onModuleInit()).resolves.not.toThrow()
        })
    })

    // ===========================================================================
    // login()
    // ===========================================================================
    describe('login()', () => {
        it('returns access and refresh tokens on valid credentials', async () => {
            const result = await service.login('correct-password', 'fp', 1)

            expect(result).toHaveProperty('accessToken')
            expect(result).toHaveProperty('refreshToken')
            expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2)
        })

        it('signs access token with correct claims', async () => {
            await service.login('correct-password', 'fp', 1)

            expect(mockJwtService.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({ sub: 1, role: 'admin' }),
                expect.objectContaining({ expiresIn: '15m' }),
            )
        })

        it('signs refresh token with correct claims', async () => {
            await service.login('correct-password', 'fp', 1)

            expect(mockJwtService.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'refresh' }),
                expect.objectContaining({ expiresIn: '7d' }),
            )
        })

        it('throws UnauthorizedError on wrong password', async () => {
            await expect(
                service.login('wrong-password', 'fp', 1)
            ).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError on shorter wrong password', async () => {
            await expect(
                service.login('short', 'fp', 1)
            ).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError on longer wrong password', async () => {
            await expect(
                service.login('correct-password-but-longer', 'fp', 1)
            ).rejects.toThrow(UnauthorizedError)
        })

        it('does not call signAsync when password is wrong', async () => {
            await expect(service.login('wrong', 'fp', 1)).rejects.toThrow()
            expect(mockJwtService.signAsync).not.toHaveBeenCalled()
        })

        it('throws if ADMIN_PASSWORD env var is not set', async () => {
            delete process.env.ADMIN_PASSWORD

            await expect(
                service.login('any-password', 'fp', 1)
            ).rejects.toThrow('[AuthService] ADMIN_PASSWORD environment variable is not set')
        })
    })

    // ===========================================================================
    // verifyAccessToken()
    // ===========================================================================
    describe('verifyAccessToken()', () => {
        it('returns payload for a valid non-revoked token', async () => {
            const payload = makeAccessPayload()
            mockJwtService.verifyAsync.mockResolvedValue(payload)

            const result = await service.verifyAccessToken('valid-token', 'test-fingerprint')

            expect(result).toEqual(payload)
        })

        it('throws UnauthorizedError if token is revoked', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(makeAccessPayload())
            mockCacheQuery.getOrSetWithProfile.mockResolvedValue(true)

            await expect(
                service.verifyAccessToken('revoked-token', 'test-fingerprint')
            ).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError if JWT verification fails', async () => {
            mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'))

            await expect(
                service.verifyAccessToken('expired-token', 'fp')
            ).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError on fingerprint mismatch when strict mode is on', async () => {
            process.env.FINGERPRINT_STRICT = 'true'
            mockJwtService.verifyAsync.mockResolvedValue(
                makeAccessPayload({ fingerprint: 'original-fp' })
            )

            await expect(
                service.verifyAccessToken('valid-token', 'different-fp')
            ).rejects.toThrow(UnauthorizedError)
        })

        it('does not enforce fingerprint when FINGERPRINT_STRICT is false', async () => {
            process.env.FINGERPRINT_STRICT = 'false'
            const payload = makeAccessPayload({ fingerprint: 'original-fp' })
            mockJwtService.verifyAsync.mockResolvedValue(payload)

            const result = await service.verifyAccessToken('valid-token', 'completely-different-fp')
            expect(result).toEqual(payload)
        })

        it('uses SHORT cache profile for revocation check', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(makeAccessPayload())

            await service.verifyAccessToken('valid-token', 'test-fingerprint')

            expect(mockCacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
                expect.stringContaining('revoked-token:'),
                'SHORT',
                expect.any(Function),
            )
        })

        it('caches revocation check with jti-specific key', async () => {
            const payload = makeAccessPayload({ jti: 'unique-jti-123' })
            mockJwtService.verifyAsync.mockResolvedValue(payload)

            await service.verifyAccessToken('valid-token', 'test-fingerprint')

            expect(mockCacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
                'revoked-token:unique-jti-123',
                'SHORT',
                expect.any(Function),
            )
        })
    })

    // ===========================================================================
    // refresh()
    // ===========================================================================
    describe('refresh()', () => {
        it('issues a new access token for a valid refresh token', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1, jti: 'refresh-jti', type: 'refresh',
            })

            const result = await service.refresh('valid-refresh-token', 'fp')

            expect(result).toHaveProperty('accessToken', 'signed-token')
        })

        it('throws UnauthorizedError if refresh token is revoked', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1, jti: 'refresh-jti', type: 'refresh',
            })
            mockCacheQuery.getOrSetWithProfile.mockResolvedValue(true)

            await expect(
                service.refresh('revoked-refresh-token', 'fp')
            ).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError if token type is not refresh', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1, jti: 'some-jti', type: 'access',
            })

            await expect(
                service.refresh('access-token-used-as-refresh', 'fp')
            ).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError if JWT verification fails', async () => {
            mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'))

            await expect(
                service.refresh('garbage-token', 'fp')
            ).rejects.toThrow(UnauthorizedError)
        })

        it('only issues access token not refresh token on refresh', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1, jti: 'refresh-jti', type: 'refresh',
            })

            await service.refresh('valid-refresh-token', 'fp')

            // Only one signAsync call — access token only, no new refresh token
            expect(mockJwtService.signAsync).toHaveBeenCalledTimes(1)
        })
    })

    // ===========================================================================
    // logout()
    // ===========================================================================
    describe('logout()', () => {
        it('revokes the token via repository', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)

            await service.logout('some-jti')

            expect(mockTokenRepo.revoke).toHaveBeenCalledWith(
                'some-jti',
                expect.any(Date),
            )
        })

        it('sets expiry to 15 minutes from now', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            const before = Date.now()

            await service.logout('some-jti')

            const expiresAt: Date = mockTokenRepo.revoke.mock.calls[0][1]
            const expectedMs = 15 * 60 * 1000
            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 100)
            expect(expiresAt.getTime()).toBeLessThanOrEqual(before + expectedMs + 100)
        })
    })

    // ===========================================================================
    // buildFingerprint()
    // ===========================================================================
    describe('buildFingerprint()', () => {
        it('returns a consistent SHA-256 hex string', () => {
            const fp1 = AuthService.buildFingerprint('Mozilla/5.0', '127.0.0.1')
            const fp2 = AuthService.buildFingerprint('Mozilla/5.0', '127.0.0.1')

            expect(fp1).toBe(fp2)
            expect(fp1).toHaveLength(64)
        })

        it('returns different fingerprints for different user agents', () => {
            const fp1 = AuthService.buildFingerprint('Chrome', '127.0.0.1')
            const fp2 = AuthService.buildFingerprint('Firefox', '127.0.0.1')

            expect(fp1).not.toBe(fp2)
        })

        it('returns different fingerprints for different IPs', () => {
            const fp1 = AuthService.buildFingerprint('Chrome', '127.0.0.1')
            const fp2 = AuthService.buildFingerprint('Chrome', '192.168.1.1')

            expect(fp1).not.toBe(fp2)
        })

        it('returns only hex characters', () => {
            const fp = AuthService.buildFingerprint('Mozilla/5.0', '127.0.0.1')

            expect(fp).toMatch(/^[0-9a-f]+$/)
        })
    })

    // ===========================================================================
    // getRefreshTokenExpiryMs()
    // ===========================================================================
    describe('getRefreshTokenExpiryMs()', () => {
        it('returns 7 days in milliseconds', () => {
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

            expect(AuthService.getRefreshTokenExpiryMs()).toBe(sevenDaysMs)
        })
    })
})