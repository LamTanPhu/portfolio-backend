/**
 * @fileoverview AuthService Unit Tests
 *
 * Tests core auth logic in isolation.
 * All external dependencies (JwtService, ITokenRepository, ICacheQueryService,
 * IUserWriteRepository, IAdminCredentialRepository) are mocked —
 * no database, no Redis, no bcrypt I/O, no network calls.
 *
 * bcrypt.compare is mocked at the module level so tests remain fast
 * (real bcrypt with work factor 12 takes ~300 ms per call).
 */

import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { AuthService } from './AuthService'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError'

// =============================================================================
// Module-level bcrypt mock
// Must be declared before any import that transitively loads bcrypt,
// and before the jest.mock() call below.
// =============================================================================
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
}))

// =============================================================================
// Module-level crypto mock
// Node's built-in `crypto` module exports are non-configurable, so
// jest.spyOn(crypto, 'randomBytes') throws ("Cannot redefine property").
// Wrapping randomBytes in jest.fn() at mock-registration time (while keeping
// every other export, e.g. createHash, fully real) lets onModuleInit()'s
// JIT-warmup call be asserted without breaking buildFingerprint()'s tests,
// which rely on real crypto.createHash().
// =============================================================================
jest.mock('crypto', () => {
    const actualCrypto = jest.requireActual('crypto') as unknown as typeof crypto
    return {
        ...actualCrypto,
        randomBytes: jest.fn(actualCrypto.randomBytes),
    }
})

import * as bcrypt from 'bcrypt'

// =============================================================================
// Test-local types
// =============================================================================
// Shape of the args recorded by mockTokenRepo.revoke's mock.calls. jest.fn()
// without generics types `.mock.calls` as `any[]`, so reads through it need
// a cast before indexing/searching — see CacheQueryService.spec.ts for the
// same pattern.
type RevokeCallArgs = [jti: string, expiresAt: Date, tx?: unknown]

// =============================================================================
// Mocks
// =============================================================================

const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
}

const mockTokenRepo = {
    revoke: jest.fn(),
    isRevoked: jest.fn(),
}

const mockCacheQuery = {
    getOrSetWithProfile: jest.fn(),
}

const mockUserWriteRepo = {
    update: jest.fn(),
}

// Fakes the IAdminCredentialRepository.findCredentialByEmail response
const mockCredentialRepo = {
    findCredentialByEmail: jest.fn(),
}

// Sentinel object standing in for Prisma's transactional client — we only
// need to verify it's the exact object passed through to tokenRepo.revoke(),
// not simulate real transaction semantics (no real DB in unit tests).
const mockTx = { __isMockTx: true }

const mockUow = {
    transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
}

// ConfigService mock — delegates to process.env so fingerprint tests can set
// FINGERPRINT_STRICT directly without rebuilding the module.
const mockConfigService = {
    get: jest.fn((key: string) => process.env[key]),
}

// =============================================================================
// Constants shared across login() tests
// =============================================================================

const ADMIN_EMAIL = 'admin@example.com'
const CORRECT_HASH = '$2b$12$validhashabcdefghijklmnopqrstuvwxyz0123456' // fake hash, bcrypt is mocked
const FAKE_CREDENTIAL = { id: 1, hashPassword: CORRECT_HASH }

// =============================================================================
// Helpers
// =============================================================================

const makeAccessPayload = (overrides = {}) => ({
    sub: 1,
    role: 'admin' as const,
    jti: 'test-jti',
    fingerprint: 'test-fingerprint',
    iss: 'portfolio-api',
    aud: 'portfolio-admin',
    ...overrides,
})

// =============================================================================
// Suite
// =============================================================================

describe('AuthService', () => {
    let service: AuthService

    beforeEach(async () => {
        jest.clearAllMocks()

        // Default happy-path mock state
        mockCacheQuery.getOrSetWithProfile.mockResolvedValue(false)
        mockTokenRepo.isRevoked.mockResolvedValue(false)
        mockJwtService.signAsync.mockResolvedValue('signed-token')
        mockUserWriteRepo.update.mockResolvedValue(undefined)

        // Default: credential found and password matches
        mockCredentialRepo.findCredentialByEmail.mockResolvedValue(FAKE_CREDENTIAL)
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: 'ITokenRepository', useValue: mockTokenRepo },
                { provide: 'ICacheQueryService', useValue: mockCacheQuery },
                { provide: 'IUserWriteRepository', useValue: mockUserWriteRepo },
                { provide: 'IAdminCredentialRepository', useValue: mockCredentialRepo },
                { provide: 'IUnitOfWork', useValue: mockUow },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile()

        service = module.get<AuthService>(AuthService)
    })

    afterEach(() => {
        delete process.env.FINGERPRINT_STRICT
    })

    // ===========================================================================
    // onModuleInit()
    // ===========================================================================
    describe('onModuleInit()', () => {
        // FIX: implementation now warms up the JIT with crypto.randomBytes(32)
        // instead of a real signed JWT — see AuthService.onModuleInit() comment
        // for the rationale (no throwaway credential is produced this way).
        it('calls crypto.randomBytes to warm up JIT on init', () => {
            service.onModuleInit()

            expect(crypto.randomBytes).toHaveBeenCalledWith(32)
            expect(mockJwtService.signAsync).not.toHaveBeenCalled()
        })

        it('completes without throwing', () => {
            expect(() => service.onModuleInit()).not.toThrow()
        })
    })

    // ===========================================================================
    // login()
    // ===========================================================================
    describe('login()', () => {
        it('returns access and refresh tokens on valid credentials', async () => {
            const result = await service.login('correct-password', 'fp', ADMIN_EMAIL)

            expect(result).toHaveProperty('accessToken')
            expect(result).toHaveProperty('refreshToken')
            expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2)
        })

        it('looks up credential by email before comparing password', async () => {
            await service.login('correct-password', 'fp', ADMIN_EMAIL)

            expect(mockCredentialRepo.findCredentialByEmail).toHaveBeenCalledWith(ADMIN_EMAIL)
        })

        it('calls bcrypt.compare with input password and stored hash', async () => {
            await service.login('correct-password', 'fp', ADMIN_EMAIL)

            expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', FAKE_CREDENTIAL.hashPassword)
        })

        it('signs access token with correct claims', async () => {
            await service.login('correct-password', 'fp', ADMIN_EMAIL)

            expect(mockJwtService.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({ sub: 1, role: 'admin' }),
                expect.objectContaining({ expiresIn: '15m' }),
            )
        })

        it('signs refresh token with correct claims', async () => {
            await service.login('correct-password', 'fp', ADMIN_EMAIL)

            expect(mockJwtService.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'refresh' }),
                expect.objectContaining({ expiresIn: '7d' }),
            )
        })

        it('throws UnauthorizedError when bcrypt.compare returns false', async () => {
            ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

            await expect(service.login('wrong-password', 'fp', ADMIN_EMAIL)).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError when email is not found in DB', async () => {
            mockCredentialRepo.findCredentialByEmail.mockResolvedValue(null)

            await expect(service.login('any-password', 'fp', 'nobody@example.com')).rejects.toThrow(UnauthorizedError)
        })

        it('does not call signAsync when password is wrong', async () => {
            ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

            await expect(service.login('wrong', 'fp', ADMIN_EMAIL)).rejects.toThrow()
            expect(mockJwtService.signAsync).not.toHaveBeenCalled()
        })

        it('does not call signAsync when email is not found', async () => {
            mockCredentialRepo.findCredentialByEmail.mockResolvedValue(null)

            await expect(service.login('any-password', 'fp', 'nobody@example.com')).rejects.toThrow()
            expect(mockJwtService.signAsync).not.toHaveBeenCalled()
        })

        it('still compares password against dummy hash when email not found (prevents timing enumeration)', async () => {
            // Even when user is not found, bcrypt.compare must still be called
            // so the response time is indistinguishable from a wrong-password attempt.
            mockCredentialRepo.findCredentialByEmail.mockResolvedValue(null)
            ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

            await expect(service.login('any-password', 'fp', 'nobody@example.com')).rejects.toThrow(UnauthorizedError)

            expect(bcrypt.compare).toHaveBeenCalledTimes(1)
        })

        it('updates lastLogin on successful login (fire-and-forget)', async () => {
            await service.login('correct-password', 'fp', ADMIN_EMAIL)

            // Allow the fire-and-forget void promise to settle
            await new Promise((resolve) => setImmediate(resolve))

            expect(mockUserWriteRepo.update).toHaveBeenCalledWith(
                FAKE_CREDENTIAL.id,
                // expect.any() is typed `any` in @types/jest; objectContaining's generic
                // inference doesn't accept a narrowed cast here, so the rule needs disabling.
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                expect.objectContaining({ lastLogin: expect.any(Date) }),
            )
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

        // FIX: issuer/audience are embedded at sign time but were never checked
        // at verify time — purely decorative claims. Now enforced.
        it('verifies the token with the expected issuer and audience', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(makeAccessPayload())

            await service.verifyAccessToken('valid-token', 'test-fingerprint')

            expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
                'valid-token',
                expect.objectContaining({ issuer: 'portfolio-api', audience: 'portfolio-admin' }),
            )
        })

        it('throws UnauthorizedError if token is revoked', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(makeAccessPayload())
            mockCacheQuery.getOrSetWithProfile.mockResolvedValue(true)

            await expect(service.verifyAccessToken('revoked-token', 'test-fingerprint')).rejects.toThrow(
                UnauthorizedError,
            )
        })

        it('throws UnauthorizedError if JWT verification fails', async () => {
            mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'))

            await expect(service.verifyAccessToken('expired-token', 'fp')).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError on fingerprint mismatch when strict mode is on', async () => {
            process.env.FINGERPRINT_STRICT = 'true'
            mockJwtService.verifyAsync.mockResolvedValue(makeAccessPayload({ fingerprint: 'original-fp' }))

            await expect(service.verifyAccessToken('valid-token', 'different-fp')).rejects.toThrow(UnauthorizedError)
        })

        it('does not enforce fingerprint when FINGERPRINT_STRICT is false', async () => {
            process.env.FINGERPRINT_STRICT = 'false'
            const payload = makeAccessPayload({ fingerprint: 'original-fp' })
            mockJwtService.verifyAsync.mockResolvedValue(payload)

            const result = await service.verifyAccessToken('valid-token', 'completely-different-fp')
            expect(result).toEqual(payload)
        })

        // Fix 6: was asserting 'SHORT' — implementation uses 'REALTIME'
        it('uses REALTIME cache profile for revocation check', async () => {
            mockJwtService.verifyAsync.mockResolvedValue(makeAccessPayload())

            await service.verifyAccessToken('valid-token', 'test-fingerprint')

            expect(mockCacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
                expect.stringContaining('revoked-token:'),
                'REALTIME',
                expect.any(Function),
            )
        })

        // Fix 6: was asserting 'SHORT' — implementation uses 'REALTIME'
        it('caches revocation check with jti-specific key', async () => {
            const payload = makeAccessPayload({ jti: 'unique-jti-123' })
            mockJwtService.verifyAsync.mockResolvedValue(payload)

            await service.verifyAccessToken('valid-token', 'test-fingerprint')

            expect(mockCacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
                'revoked-token:unique-jti-123',
                'REALTIME',
                expect.any(Function),
            )
        })
    })

    // ===========================================================================
    // refresh()
    // ===========================================================================
    describe('refresh()', () => {
        // FIX: refresh() enforces fingerprint matching the same way
        // verifyAccessToken() does (FINGERPRINT_STRICT defaults to enforced).
        // These payloads must carry a `fingerprint` matching the 'fp' arg
        // passed to service.refresh() below, or every case here throws
        // UnauthorizedError before reaching the behavior under test.
        it('returns both a new access token and a new refresh token', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'refresh-jti',
                type: 'refresh',
                fingerprint: 'fp',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })

            const result = await service.refresh('valid-refresh-token', 'fp')

            expect(result).toHaveProperty('accessToken', 'signed-token')
            expect(result).toHaveProperty('refreshToken', 'signed-token')
        })

        it('issues both tokens in parallel — two signAsync calls on valid refresh', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'refresh-jti',
                type: 'refresh',
                fingerprint: 'fp',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })

            await service.refresh('valid-refresh-token', 'fp')

            // One call for the new access token, one for the new refresh token
            expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2)
        })

        it('verifies the refresh token with the expected issuer and audience', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'refresh-jti',
                type: 'refresh',
                fingerprint: 'fp',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })

            await service.refresh('valid-refresh-token', 'fp')

            expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
                'valid-refresh-token',
                expect.objectContaining({ issuer: 'portfolio-api', audience: 'portfolio-admin' }),
            )
        })

        it('revokes the consumed refresh token (rotation)', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'old-refresh-jti',
                type: 'refresh',
                fingerprint: 'fp',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })
            mockTokenRepo.revoke.mockResolvedValue(undefined)

            await service.refresh('valid-refresh-token', 'fp')

            expect(mockTokenRepo.revoke).toHaveBeenCalledWith('old-refresh-jti', expect.any(Date))
        })

        it('throws UnauthorizedError on refresh fingerprint mismatch', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'refresh-jti',
                type: 'refresh',
                fingerprint: 'original-fp',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })

            await expect(service.refresh('valid-refresh-token', 'different-fp')).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError if refresh token is revoked', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'refresh-jti',
                type: 'refresh',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })
            mockCacheQuery.getOrSetWithProfile.mockResolvedValue(true)

            await expect(service.refresh('revoked-refresh-token', 'fp')).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError if token type is not refresh', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({
                sub: 1,
                jti: 'some-jti',
                type: 'access',
                exp: Math.floor(Date.now() / 1000) + 900,
            })

            await expect(service.refresh('access-token-used-as-refresh', 'fp')).rejects.toThrow(UnauthorizedError)
        })

        it('throws UnauthorizedError if JWT verification fails', async () => {
            mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'))

            await expect(service.refresh('garbage-token', 'fp')).rejects.toThrow(UnauthorizedError)
        })
    })

    // ===========================================================================
    // logout()
    // ===========================================================================
    describe('logout()', () => {
        it('revokes the access token via repository, inside a transaction', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)

            await service.logout('some-jti')

            expect(mockUow.transaction).toHaveBeenCalledTimes(1)
            expect(mockTokenRepo.revoke).toHaveBeenCalledWith('some-jti', expect.any(Date), mockTx)
        })

        it('sets access token expiry to 15 minutes from now', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            const before = Date.now()

            await service.logout('some-jti')

            const calls = mockTokenRepo.revoke.mock.calls as RevokeCallArgs[]
            const expiresAt = calls[0][1]
            const expectedMs = 15 * 60 * 1000
            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 100)
            expect(expiresAt.getTime()).toBeLessThanOrEqual(before + expectedMs + 100)
        })

        // FIX: the tests above only ever call logout() with a single argument,
        // so refreshToken is always undefined and the entire second-token
        // revocation branch below (decode → check type → revoke jti) never ran.
        // That branch is exactly what AuthController.logout() exercises in
        // production (it always passes the refresh cookie), so it needs its
        // own coverage rather than piggybacking on the single-arg tests.
        it('also revokes the refresh token jti when a valid refresh token is passed', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            mockJwtService.decode.mockReturnValue({ jti: 'refresh-jti-456', type: 'refresh' })

            await service.logout('access-jti-123', 'some-refresh-cookie-value')

            expect(mockJwtService.decode).toHaveBeenCalledWith('some-refresh-cookie-value')
            expect(mockTokenRepo.revoke).toHaveBeenCalledWith('access-jti-123', expect.any(Date), mockTx)
            expect(mockTokenRepo.revoke).toHaveBeenCalledWith('refresh-jti-456', expect.any(Date), mockTx)
            expect(mockTokenRepo.revoke).toHaveBeenCalledTimes(2)
        })

        it('sets refresh token expiry using the refresh TTL, not the 15-minute access TTL', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            mockJwtService.decode.mockReturnValue({ jti: 'refresh-jti-456', type: 'refresh' })
            const before = Date.now()

            await service.logout('access-jti-123', 'some-refresh-cookie-value')

            const calls = mockTokenRepo.revoke.mock.calls as RevokeCallArgs[]
            const refreshCall = calls.find((call) => call[0] === 'refresh-jti-456')
            const expiresAt = refreshCall![1]
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 100)
        })

        it('does not revoke a second token when decoded payload has no jti', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            mockJwtService.decode.mockReturnValue({ type: 'refresh' }) // no jti

            await service.logout('access-jti-123', 'malformed-cookie')

            expect(mockTokenRepo.revoke).toHaveBeenCalledTimes(1)
        })

        it('does not revoke a second token when decoded payload type is not refresh', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            mockJwtService.decode.mockReturnValue({ jti: 'some-jti', type: 'access' })

            await service.logout('access-jti-123', 'wrong-type-token')

            expect(mockTokenRepo.revoke).toHaveBeenCalledTimes(1)
        })

        it('still revokes the access token when jwt.decode throws on a malformed cookie', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)
            mockJwtService.decode.mockImplementation(() => {
                throw new Error('malformed token')
            })

            await expect(service.logout('access-jti-123', 'garbage-not-a-jwt')).resolves.not.toThrow()

            expect(mockTokenRepo.revoke).toHaveBeenCalledWith('access-jti-123', expect.any(Date), mockTx)
            expect(mockTokenRepo.revoke).toHaveBeenCalledTimes(1)
        })

        it('does not call jwt.decode when no refresh token is provided', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)

            await service.logout('access-jti-123')

            expect(mockJwtService.decode).not.toHaveBeenCalled()
        })

        // UnitOfWork-specific coverage
        it('decodes the refresh cookie before opening the transaction, not inside it', async () => {
            mockTokenRepo.revoke.mockResolvedValue(undefined)

            const callOrder: string[] = []
            mockJwtService.decode.mockImplementationOnce(() => {
                callOrder.push('decode')
                return { jti: 'refresh-jti-456', type: 'refresh' }
            })
            mockUow.transaction.mockImplementationOnce(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
                callOrder.push('transaction-start')
                return fn(mockTx)
            })

            await service.logout('access-jti-123', 'some-refresh-cookie-value')

            expect(callOrder).toEqual(['decode', 'transaction-start'])
        })

        it('propagates an error if the transaction fails, without swallowing it', async () => {
            mockUow.transaction.mockRejectedValueOnce(new Error('deadlock detected'))

            await expect(service.logout('some-jti')).rejects.toThrow('deadlock detected')
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
