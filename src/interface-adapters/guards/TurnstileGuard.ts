/**
 * @fileoverview TurnstileGuard
 *
 * Protects public mutation endpoints (mainly Contact form) against spam and bots
 * using Cloudflare Turnstile verification.
 *
 * Fail-closed design: any verification failure results in rejection.
 * Placed in Interface Adapters layer — use cases remain unaware of anti-bot mechanisms.
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
    HttpException,
    Logger,
    Inject,
} from '@nestjs/common'
import type { Request } from 'express'

import type { ITurnstileVerifier } from '../../application/ports/ITurnstileVerifier'

// NOTE: local, minimal shape for the incoming body — Express types `req.body`
// as `any` by default. If a shared DTO for this route already types
// `turnstileToken` (e.g. a SubmitContactDto), prefer importing that instead.
interface TurnstileRequestBody {
    turnstileToken?: unknown
}

@Injectable()
export class TurnstileGuard implements CanActivate {
    private readonly logger = new Logger(TurnstileGuard.name)

    constructor(
        @Inject('ITurnstileVerifier')
        private readonly turnstile: ITurnstileVerifier,
    ) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>()
        const body = req.body as TurnstileRequestBody
        const token = body.turnstileToken as string | undefined

        if (typeof token !== 'string' || token.trim().length === 0) {
            this.logger.warn(`Missing Turnstile token | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
            throw new BadRequestException('Turnstile token is required')
        }

        try {
            const isValid = await this.turnstile.verifyToken(token.trim())

            if (!isValid) {
                this.logger.warn(`Invalid Turnstile token | IP: ${req.ip ?? 'unknown'} | ${req.method} ${req.url}`)
                throw new BadRequestException('Turnstile verification failed. Please try again.')
            }

            // Leave the verified token on the request body. NestJS executes guards
            // before the route's ValidationPipe, and SubmitContactDto still declares
            // turnstileToken as a required input. Mutating the body here would make
            // an otherwise valid request fail DTO validation with 400.
            return true
        } catch (error) {
            // Re-throw NestJS HTTP exceptions as-is (e.g. the BadRequestException thrown
            // above when isValid is false). Without this guard the outer catch would
            // swallow the specific message and replace it with the generic fallback below.
            if (error instanceof HttpException) throw error

            this.logger.error(`Turnstile verification error | IP: ${req.ip ?? 'unknown'}`, error)
            throw new BadRequestException('Turnstile verification failed')
        }
    }
}
