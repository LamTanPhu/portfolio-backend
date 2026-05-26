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

/** Builds a minimal valid access token payload */
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
    // Reset all mocks before each test to prevent state bleed
    jest.clearAllMocks()

    // Default: tokens are not revoked
    mockCacheQuery.getOrSetWithProfile.mockResolvedValue(false)
    mockTokenRepo.isRevoked.mockResolvedValue(false)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService,           useValue: mockJwtService  },
        { provide: 'ITokenRepository',   useValue: mockTokenRepo   },
        { provide: 'ICacheQueryService', useValue: mockCacheQuery  },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)

    // Ensure ADMIN_PASSWORD is set for login tests
    process.env.ADMIN_PASSWORD = 'correct-password'
  })

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD
    delete process.env.FINGERPRINT_STRICT
  })

  // ===========================================================================
  // login()
  // ===========================================================================
  describe('login()', () => {
    it('returns access and refresh tokens on valid credentials', async () => {
      mockJwtService.signAsync.mockResolvedValue('signed-token')

      const result = await service.login('correct-password', 'fp', 1)

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2)
    })

    it('throws UnauthorizedError on wrong password', async () => {
      await expect(
        service.login('wrong-password', 'fp', 1)
      ).rejects.toThrow(UnauthorizedError)
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
      // Simulate revoked token via cache
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

      // Should NOT throw even though fingerprint differs
      const result = await service.verifyAccessToken('valid-token', 'completely-different-fp')
      expect(result).toEqual(payload)
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
      mockJwtService.signAsync.mockResolvedValue('new-access-token')

      const result = await service.refresh('valid-refresh-token', 'fp')

      expect(result).toHaveProperty('accessToken', 'new-access-token')
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
        sub: 1, jti: 'some-jti', type: 'access', // wrong type
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
  })

  // ===========================================================================
  // Static helpers
  // ===========================================================================
  describe('buildFingerprint()', () => {
    it('returns a consistent SHA-256 hex string', () => {
      const fp1 = AuthService.buildFingerprint('Mozilla/5.0', '127.0.0.1')
      const fp2 = AuthService.buildFingerprint('Mozilla/5.0', '127.0.0.1')

      expect(fp1).toBe(fp2)
      expect(fp1).toHaveLength(64) // SHA-256 hex = 64 chars
    })

    it('returns different fingerprints for different inputs', () => {
      const fp1 = AuthService.buildFingerprint('Chrome', '127.0.0.1')
      const fp2 = AuthService.buildFingerprint('Firefox', '127.0.0.1')

      expect(fp1).not.toBe(fp2)
    })
  })
})