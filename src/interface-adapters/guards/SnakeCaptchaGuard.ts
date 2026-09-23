/**
 * @fileoverview SnakeCaptchaGuard
 *
 * Second anti-bot layer on POST /contact, stacked alongside (never instead
 * of) TurnstileGuard. Structurally mirrors TurnstileGuard on purpose —
 * same fail-closed design, same error-handling shape — so the two guards
 * read as one consistent pattern rather than two unrelated ones.
 *
 * Placed in Interface Adapters layer — use cases remain unaware of
 * anti-bot mechanisms, same rationale as TurnstileGuard.
 */

import { Injectable, CanActivate, ExecutionContext, Logger, Inject } from '@nestjs/common'
import type { Request } from 'express'

import type { ISnakeCaptchaVerifier } from '../../application/ports/ISnakeCaptchaVerifier'
import { DomainError } from '../../domain/errors/DomainError'
import { ValidationError } from '../../domain/errors/ValidationError'

interface SnakeCaptchaRequestBody {
    snakeProofToken?: unknown
}

@Injectable()
export class SnakeCaptchaGuard implements CanActivate {
    private readonly logger = new Logger(SnakeCaptchaGuard.name)

    constructor(
        @Inject('ISnakeCaptchaVerifier')
        private readonly snakeCaptcha: ISnakeCaptchaVerifier,
    ) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>()
        const body = req.body as SnakeCaptchaRequestBody
        const token = body.snakeProofToken as string | undefined

        if (typeof token !== 'string' || token.trim().length === 0) {
            this.logger.warn(`Missing snake captcha proof | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
            throw new ValidationError('Snake captcha proof is required')
        }

        try {
            const isValid = await this.snakeCaptcha.verifyProof(token.trim())

            if (!isValid) {
                this.logger.warn(`Invalid snake captcha proof | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
                throw new ValidationError('Snake captcha verification failed. Please play the game again.')
            }

            // Left on the body, same reasoning as TurnstileGuard: guards run
            // before Nest's ValidationPipe, and SubmitContactDto still
            // declares snakeProofToken as required.
            return true
        } catch (error) {
            if (error instanceof DomainError) throw error

            this.logger.error(`Snake captcha verification error | IP: ${req.ip ?? 'unknown'}`, error)
            throw new ValidationError('Snake captcha verification failed')
        }
    }
}
