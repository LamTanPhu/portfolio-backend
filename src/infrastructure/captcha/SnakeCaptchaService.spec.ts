/**
 * @fileoverview SnakeCaptchaService Unit Tests
 *
 * CACHE_MANAGER and JwtService are both fully mocked — no Redis connection
 * and no real signing required. Constants mirrored from the service under
 * test (WIN_TARGET=10, TICK_MS=140, MIN_TICKS_PER_FOOD=3 → MIN_DURATION_MS
 * = 4200ms, MIN_MOVE_COUNT=5, TIMING_GRACE_MS=2000) are recomputed here
 * rather than imported, since they're intentionally private implementation
 * detail — the tests instead probe the resulting boundary behavior.
 *
 * Key behaviors tested:
 *  - issueChallenge() stores a fresh entry and returns its id
 *  - verifyCompletion(): unknown/expired challenge → null, no consumption
 *  - verifyCompletion(): every plausibility check's boundary (eaten count,
 *    minimum duration, minimum move count, elapsed-time-vs-claimed-duration)
 *  - single-use: the challenge is deleted from cache exactly once verification
 *    proceeds past the existence check, regardless of whether later checks fail
 *  - signing failure is caught and treated as verification failure
 *  - verifyProof(): missing/empty/malformed/expired/wrong-scope tokens all
 *    fail closed; only a validly-signed, correct-scope, unexpired token passes
 */

import type { Cache } from 'cache-manager'
import type { JwtService } from '@nestjs/jwt'
import { SnakeCaptchaService } from './SnakeCaptchaService'

// =============================================================================
// Constants mirrored from the service (see file header)
// =============================================================================
const WIN_TARGET = 10
const MIN_DURATION_MS = 4200
const MIN_MOVE_COUNT = 5
const TIMING_GRACE_MS = 2000

// =============================================================================
// Mocks
// =============================================================================

const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}

const mockJwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
}

const CHALLENGE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

function makeInput(overrides: Partial<Parameters<SnakeCaptchaService['verifyCompletion']>[0]> = {}) {
    return {
        challengeId: CHALLENGE_ID,
        eaten: WIN_TARGET,
        durationMs: MIN_DURATION_MS + 10_000, // comfortably above the floor
        moveCount: MIN_MOVE_COUNT + 10,
        ...overrides,
    }
}

// =============================================================================
// Suite
// =============================================================================

describe('SnakeCaptchaService', () => {
    let service: SnakeCaptchaService

    beforeEach(() => {
        jest.clearAllMocks()
        mockCache.set.mockResolvedValue(undefined)
        mockCache.del.mockResolvedValue(undefined)
        service = new SnakeCaptchaService(mockCache as unknown as Cache, mockJwt as unknown as JwtService)
    })

    // ---------------------------------------------------------------------------
    // issueChallenge()
    // ---------------------------------------------------------------------------
    describe('issueChallenge()', () => {
        it('returns a challenge id', async () => {
            const id = await service.issueChallenge()

            expect(typeof id).toBe('string')
            expect(id.length).toBeGreaterThan(0)
        })

        it('stores the challenge in cache under a namespaced key with a TTL', async () => {
            const id = await service.issueChallenge()

            expect(mockCache.set).toHaveBeenCalledTimes(1)
            const [key, value, ttl] = mockCache.set.mock.calls[0] as [string, number, number]
            expect(key).toBe(`snake-captcha:challenge:${id}`)
            expect(typeof value).toBe('number') // issuedAt timestamp
            expect(ttl).toBeGreaterThan(0)
        })

        it('issues a different id on each call', async () => {
            const first = await service.issueChallenge()
            const second = await service.issueChallenge()

            expect(first).not.toBe(second)
        })
    })

    // ---------------------------------------------------------------------------
    // verifyCompletion() — challenge existence / single-use
    // ---------------------------------------------------------------------------
    describe('verifyCompletion() — challenge existence', () => {
        it('returns null when the challenge is unknown (never issued)', async () => {
            mockCache.get.mockResolvedValue(undefined)

            const result = await service.verifyCompletion(makeInput())

            expect(result).toBeNull()
        })

        it('returns null when the challenge has expired (cache returns null)', async () => {
            mockCache.get.mockResolvedValue(null)

            const result = await service.verifyCompletion(makeInput())

            expect(result).toBeNull()
        })

        it('does not attempt to consume a challenge that was never found', async () => {
            mockCache.get.mockResolvedValue(undefined)

            await service.verifyCompletion(makeInput())

            expect(mockCache.del).not.toHaveBeenCalled()
        })

        it('consumes (deletes) the challenge as soon as it is found, before any plausibility check', async () => {
            mockCache.get.mockResolvedValue(Date.now())
            mockJwt.signAsync.mockResolvedValue('proof-token')

            await service.verifyCompletion(makeInput())

            expect(mockCache.del).toHaveBeenCalledWith(`snake-captcha:challenge:${CHALLENGE_ID}`)
            expect(mockCache.del).toHaveBeenCalledTimes(1)
        })

        it('consumes the challenge even when a later plausibility check fails', async () => {
            mockCache.get.mockResolvedValue(Date.now())

            await service.verifyCompletion(makeInput({ eaten: 3 })) // fails the eaten check

            expect(mockCache.del).toHaveBeenCalledTimes(1)
        })
    })

    // ---------------------------------------------------------------------------
    // verifyCompletion() — plausibility checks
    // ---------------------------------------------------------------------------
    describe('verifyCompletion() — plausibility checks', () => {
        beforeEach(() => {
            mockCache.get.mockResolvedValue(Date.now())
        })

        it('rejects when eaten is below the win target', async () => {
            const result = await service.verifyCompletion(makeInput({ eaten: WIN_TARGET - 1 }))
            expect(result).toBeNull()
        })

        it('rejects when eaten exceeds the win target (also implausible)', async () => {
            const result = await service.verifyCompletion(makeInput({ eaten: WIN_TARGET + 1 }))
            expect(result).toBeNull()
        })

        it('rejects a durationMs at the implausibility floor minus one', async () => {
            const result = await service.verifyCompletion(makeInput({ durationMs: MIN_DURATION_MS - 1 }))
            expect(result).toBeNull()
        })

        it('accepts a durationMs exactly at the floor', async () => {
            mockJwt.signAsync.mockResolvedValue('proof-token')
            const result = await service.verifyCompletion(makeInput({ durationMs: MIN_DURATION_MS }))
            expect(result).toBe('proof-token')
        })

        it('rejects a moveCount below the minimum', async () => {
            const result = await service.verifyCompletion(makeInput({ moveCount: MIN_MOVE_COUNT - 1 }))
            expect(result).toBeNull()
        })

        it('accepts a moveCount exactly at the minimum', async () => {
            mockJwt.signAsync.mockResolvedValue('proof-token')
            const result = await service.verifyCompletion(makeInput({ moveCount: MIN_MOVE_COUNT }))
            expect(result).toBe('proof-token')
        })

        it('rejects when claimed durationMs exceeds actual elapsed time since issuance (beyond grace)', async () => {
            const issuedAt = Date.now() - 1000 // only 1s has actually passed
            mockCache.get.mockResolvedValue(issuedAt)

            const result = await service.verifyCompletion(makeInput({ durationMs: 1000 + TIMING_GRACE_MS + 1 }))

            expect(result).toBeNull()
        })

        it('accepts claimed durationMs within elapsed time plus grace', async () => {
            const issuedAt = Date.now() - 20_000 // 20s has actually passed — plenty of room
            mockCache.get.mockResolvedValue(issuedAt)
            mockJwt.signAsync.mockResolvedValue('proof-token')

            const result = await service.verifyCompletion(makeInput({ durationMs: 15_000 }))

            expect(result).toBe('proof-token')
        })
    })

    // ---------------------------------------------------------------------------
    // verifyCompletion() — proof minting
    // ---------------------------------------------------------------------------
    describe('verifyCompletion() — proof minting', () => {
        beforeEach(() => {
            mockCache.get.mockResolvedValue(Date.now())
        })

        it('returns the signed proof token when every check passes', async () => {
            mockJwt.signAsync.mockResolvedValue('signed-proof-token')

            const result = await service.verifyCompletion(makeInput())

            expect(result).toBe('signed-proof-token')
            expect(mockJwt.signAsync).toHaveBeenCalledWith({ scope: 'snake-captcha-proof' }, { expiresIn: '5m' })
        })

        it('returns null when signing throws', async () => {
            mockJwt.signAsync.mockRejectedValue(new Error('signing key unavailable'))

            const result = await service.verifyCompletion(makeInput())

            expect(result).toBeNull()
        })
    })

    // ---------------------------------------------------------------------------
    // verifyProof()
    // ---------------------------------------------------------------------------
    describe('verifyProof()', () => {
        it('returns false for an empty string', async () => {
            expect(await service.verifyProof('')).toBe(false)
            expect(mockJwt.verifyAsync).not.toHaveBeenCalled()
        })

        it('returns false for a whitespace-only string', async () => {
            expect(await service.verifyProof('   ')).toBe(false)
            expect(mockJwt.verifyAsync).not.toHaveBeenCalled()
        })

        it('returns true for a validly-signed token with the correct scope', async () => {
            mockJwt.verifyAsync.mockResolvedValue({ scope: 'snake-captcha-proof' })

            expect(await service.verifyProof('valid-token')).toBe(true)
        })

        it('trims the token before verifying', async () => {
            mockJwt.verifyAsync.mockResolvedValue({ scope: 'snake-captcha-proof' })

            await service.verifyProof('  valid-token  ')

            expect(mockJwt.verifyAsync).toHaveBeenCalledWith('valid-token')
        })

        it('returns false when the signature is valid but the scope does not match', async () => {
            mockJwt.verifyAsync.mockResolvedValue({ scope: 'something-else' })

            expect(await service.verifyProof('valid-token')).toBe(false)
        })

        it('returns false when verification throws (expired, tampered, wrong secret, malformed)', async () => {
            mockJwt.verifyAsync.mockRejectedValue(new Error('jwt expired'))

            expect(await service.verifyProof('bad-token')).toBe(false)
        })
    })
})
