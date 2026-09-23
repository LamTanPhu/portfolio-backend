/**
 * @fileoverview CaptchaController
 *
 * Public endpoints backing the snake-game anti-bot check (see
 * SnakeCaptchaService for the full design rationale). Fully public, like
 * SpotifyController — no AuthModule dependency.
 */

import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import type { ISnakeCaptchaVerifier } from '../../../application/ports/ISnakeCaptchaVerifier'
import { ValidationError } from '../../../domain/errors/ValidationError'
import { VerifySnakeCaptchaDto } from './captcha.dto'

@ApiTags('Captcha')
@Controller('captcha/snake')
export class CaptchaController {
    constructor(
        @Inject('ISnakeCaptchaVerifier')
        private readonly snakeCaptcha: ISnakeCaptchaVerifier,
    ) {}

    @Post('challenge')
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOperation({ summary: 'Issue a single-use snake-game challenge (public)' })
    @ApiResponse({ status: 201, description: 'Challenge issued' })
    @ApiResponse({ status: 429, description: 'Too many requests — try again later' })
    async challenge(): Promise<{ challengeId: string }> {
        const challengeId = await this.snakeCaptcha.issueChallenge()
        return { challengeId }
    }

    @Post('verify')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @ApiOperation({ summary: 'Verify a completed snake-game challenge and receive a proof token (public)' })
    @ApiResponse({ status: 200, description: 'Verification succeeded, proof token returned' })
    @ApiResponse({
        status: 400,
        description: 'Verification failed — challenge unknown/expired/used, or implausible completion',
    })
    @ApiResponse({ status: 429, description: 'Too many requests — try again later' })
    async verify(@Body() dto: VerifySnakeCaptchaDto): Promise<{ proofToken: string }> {
        const proofToken = await this.snakeCaptcha.verifyCompletion(dto)

        if (!proofToken) {
            throw new ValidationError('Snake captcha verification failed — play the game again.')
        }

        return { proofToken }
    }
}
