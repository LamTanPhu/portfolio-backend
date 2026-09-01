/**
 * @fileoverview DomainThrottlerGuard Unit Tests
 *
 * The regression this guards against: @nestjs/throttler's default
 * throwThrottlingException() throws its own ThrottlerException, which is
 * NOT a DomainError and therefore never reaches DomainExceptionFilter's
 * IP-logging branch for 429s. This override must produce a real
 * RateLimitError (a DomainError) instead — that's the entire point of
 * this class, so it's the one thing this spec actually needs to prove.
 */

import { DomainError } from '../../domain/errors/DomainError'
import { RateLimitError } from '../../domain/errors/RateLimitError'
import { DomainThrottlerGuard } from './DomainThrottlerGuard'

describe('DomainThrottlerGuard', () => {
    // Constructor args are never touched by anything this spec calls —
    // ThrottlerGuard's constructor just assigns them to protected fields,
    // it doesn't validate them. Real values only matter for canActivate(),
    // which isn't under test here.
    const guard = new DomainThrottlerGuard({} as never, {} as never, {} as never)

    it('rejects with RateLimitError instead of the library default ThrottlerException', async () => {
        await expect(
            // Protected method — accessing it this way is the standard
            // pattern for testing a protected override in isolation.
            (guard as unknown as { throwThrottlingException: () => Promise<void> }).throwThrottlingException(),
        ).rejects.toBeInstanceOf(RateLimitError)
    })

    it('produces a DomainError so DomainExceptionFilter can actually catch it', async () => {
        await expect(
            (guard as unknown as { throwThrottlingException: () => Promise<void> }).throwThrottlingException(),
        ).rejects.toBeInstanceOf(DomainError)
    })

    it('carries statusCode 429', async () => {
        try {
            await (guard as unknown as { throwThrottlingException: () => Promise<void> }).throwThrottlingException()
            fail('expected throwThrottlingException to reject')
        } catch (err) {
            expect((err as RateLimitError).statusCode).toBe(429)
        }
    })
})
