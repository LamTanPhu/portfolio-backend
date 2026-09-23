/**
 * @fileoverview CaptchaModule
 *
 * Exposes the public snake-game challenge/verify endpoints and the
 * ISnakeCaptchaVerifier provider that SnakeCaptchaGuard depends on.
 *
 * Registers its own JwtModule instance bound to SNAKE_CAPTCHA_SECRET —
 * deliberately a separate secret and separate JwtService binding from
 * AuthModule's, so proof tokens and real auth tokens can never be
 * confused even by a wiring mistake. This module does not import
 * AuthModule and never will.
 *
 * Exported so ContactModule can import it purely to make
 * ISnakeCaptchaVerifier available to SnakeCaptchaGuard in its own DI scope.
 */

import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { CaptchaController } from './captcha.controller'
import { SnakeCaptchaService } from '../../../infrastructure/captcha/SnakeCaptchaService'

@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('SNAKE_CAPTCHA_SECRET'),
                signOptions: { expiresIn: '5m' },
            }),
        }),
    ],

    controllers: [CaptchaController],

    providers: [SnakeCaptchaService, { provide: 'ISnakeCaptchaVerifier', useExisting: SnakeCaptchaService }],

    exports: [{ provide: 'ISnakeCaptchaVerifier', useExisting: SnakeCaptchaService }],
})
export class CaptchaModule {}
