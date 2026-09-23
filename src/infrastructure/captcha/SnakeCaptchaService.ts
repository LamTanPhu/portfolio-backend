/**
 * @fileoverview SnakeCaptchaService
 *
 * Concrete implementation of ISnakeCaptchaVerifier — the in-house anti-bot
 * check that runs alongside Turnstile on the contact form (see
 * SnakeCaptchaGuard and TurnstileGuard, stacked together on POST /contact).
 *
 * Design, and why it's deliberately NOT a full server-side game replay:
 *
 * A cryptographically airtight version of this would require porting the
 * frontend's entire game engine (SnakeGame.tsx's reducer) to the backend,
 * seeding food positions server-side, and replaying the exact move sequence
 * to verify the outcome — real, ongoing engineering (keeping two engines in
 * sync forever) for a feature whose actual job is raising the bar against
 * generic contact-form spam bots, not defeating a targeted attacker who's
 * willing to reverse-engineer a bespoke protocol. Turnstile already
 * provides the real cryptographic defense; this is an intentionally thin
 * second layer on top of it.
 *
 * So instead: the backend issues a single-use challenge, and trusts a
 * client-reported outcome only after it passes plausibility checks that a
 * naive forged request (the realistic threat here) won't satisfy:
 *   - the challenge must exist and be unused (consumed atomically here,
 *     regardless of whether the rest of verification succeeds)
 *   - eaten must exactly equal the frontend's win condition (10 food items)
 *   - durationMs/moveCount must be physically plausible given the game's
 *     fixed tick rate — catches "instant win" forgery
 *   - durationMs can't exceed how much time has actually elapsed
 *     server-side since the challenge was issued — catches replaying a
 *     recorded transcript's timing against a freshly issued challenge
 *
 * On success, a short-lived signed proof token is minted (via a JwtService
 * bound to its own SNAKE_CAPTCHA_SECRET, registered in CaptchaModule —
 * intentionally a different secret than auth JWTs, so the two token
 * families can never be confused even if this class and AuthService were
 * ever mixed up in DI). SnakeCaptchaGuard checks that proof token before
 * /contact accepts the submission.
 */

import { Inject, Injectable, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'

import type { ISnakeCaptchaVerifier, SnakeCompletionInput } from '../../application/ports/ISnakeCaptchaVerifier'

interface ProofPayload {
    scope: 'snake-captcha-proof'
}

@Injectable()
export class SnakeCaptchaService implements ISnakeCaptchaVerifier {
    private readonly logger = new Logger(SnakeCaptchaService.name)

    /** Namespaced cache key prefix — mirrors CacheQueryService's own prefixing convention. */
    private readonly CACHE_PREFIX = 'snake-captcha:challenge:'

    /** How long a challenge stays valid/unconsumed before it's forgotten. */
    private readonly CHALLENGE_TTL_MS = 5 * 60 * 1000

    /** How long a minted proof token is accepted by SnakeCaptchaGuard. */
    private readonly PROOF_EXPIRES_IN = '5m'

    /** Must match FOOD_COUNT in src/presentation/organisms/SnakeGame.tsx on the frontend. */
    private readonly WIN_TARGET = 10

    /** Must match TICK_MS in the same frontend file. */
    private readonly TICK_MS = 140

    /**
     * Conservative floor, not a tight optimality bound: eating all 10 food
     * items takes real playthroughs far longer than this in practice (the
     * grid is 14x14 and food spawns randomly), so this only exists to catch
     * an obviously-forged near-instant "win" — it should essentially never
     * reject a genuine player.
     */
    private readonly MIN_TICKS_PER_FOOD = 3
    private readonly MIN_DURATION_MS = this.WIN_TARGET * this.MIN_TICKS_PER_FOOD * this.TICK_MS // 4200ms

    /**
     * Kept deliberately low for the same false-positive-avoidance reason —
     * this is a weak signal on its own, only meant to catch a request that
     * clearly never turned the snake at all.
     */
    private readonly MIN_MOVE_COUNT = 5

    /** Grace window added to elapsed-time checks to absorb real request latency. */
    private readonly TIMING_GRACE_MS = 2000

    constructor(
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        private readonly jwt: JwtService,
    ) {}

    async issueChallenge(): Promise<string> {
        const challengeId = crypto.randomUUID()
        await this.cache.set(this.cacheKey(challengeId), Date.now(), this.CHALLENGE_TTL_MS)
        return challengeId
    }

    async verifyCompletion(input: SnakeCompletionInput): Promise<string | null> {
        const key = this.cacheKey(input.challengeId)
        const issuedAt = await this.cache.get<number>(key)

        if (issuedAt === undefined || issuedAt === null) {
            this.logger.warn(`Unknown, expired, or already-used challenge: ${input.challengeId}`)
            return null
        }

        // Single-use: consume now, before further checks, so a request that
        // fails plausibility can't be retried against the same challenge.
        await this.cache.del(key)

        if (input.eaten !== this.WIN_TARGET) {
            this.logger.warn(`Incomplete game reported (eaten=${input.eaten}, need ${this.WIN_TARGET})`)
            return null
        }

        if (input.durationMs < this.MIN_DURATION_MS) {
            this.logger.warn(`Implausibly fast completion reported (${input.durationMs}ms)`)
            return null
        }

        if (input.moveCount < this.MIN_MOVE_COUNT) {
            this.logger.warn(`Implausibly few moves reported (${input.moveCount})`)
            return null
        }

        const elapsedSinceIssue = Date.now() - issuedAt
        if (input.durationMs > elapsedSinceIssue + this.TIMING_GRACE_MS) {
            this.logger.warn('Claimed duration exceeds actual elapsed time since challenge issuance')
            return null
        }

        try {
            const payload: ProofPayload = { scope: 'snake-captcha-proof' }
            return await this.jwt.signAsync(payload, { expiresIn: this.PROOF_EXPIRES_IN })
        } catch (error) {
            this.logger.error('Failed to sign snake captcha proof token', error)
            return null
        }
    }

    async verifyProof(token: string): Promise<boolean> {
        if (!token?.trim()) return false

        try {
            const payload = await this.jwt.verifyAsync<ProofPayload>(token.trim())
            return payload.scope === 'snake-captcha-proof'
        } catch {
            // Expired, tampered, wrong secret, malformed — all treated the
            // same: fail closed, no distinction leaked to the caller.
            return false
        }
    }

    private cacheKey(challengeId: string): string {
        return this.CACHE_PREFIX + challengeId
    }
}
