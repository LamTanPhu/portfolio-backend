/**
 * @fileoverview DomainThrottlerGuard
 *
 * BUG FIX: @nestjs/throttler's default ThrottlerGuard throws its own
 * ThrottlerException on a 429 — a plain HttpException, not a DomainError.
 * DomainExceptionFilter is scoped `@Catch(DomainError)`, so every real
 * rate-limit rejection was silently skipping the filter's IP-logging branch
 * entirely (`statusCode === 429` → log with IP to spot abuse patterns).
 * That branch was dead code: RateLimitError existed for exactly this and
 * was never actually thrown anywhere.
 *
 * Overriding this one protected hook is the officially supported extension
 * point (see ThrottlerGuard.throwThrottlingException in @nestjs/throttler)
 * — no need to touch canActivate() or reimplement any limit-tracking logic,
 * only what gets thrown when a limit is already known to be exceeded.
 */

import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { RateLimitError } from '../../domain/errors/RateLimitError'

@Injectable()
export class DomainThrottlerGuard extends ThrottlerGuard {
    // Overriding with zero parameters is valid TS — callers (inside
    // ThrottlerGuard itself) still pass (context, throttlerLimitDetail),
    // this override just never needs to read either.
    protected override throwThrottlingException(): Promise<void> {
        return Promise.reject(new RateLimitError())
    }
}
