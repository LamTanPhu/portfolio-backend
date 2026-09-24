/**
 * @fileoverview createTestApp
 *
 * Boots a real Nest application for e2e tests, mirroring main.ts's
 * middleware stack exactly (minus HTTPS/Swagger/app.listen(), which e2e
 * tests never need — supertest talks to the app in-process over its
 * underlying http.Server).
 *
 * This matters more than it looks: without cookie-parser wired up exactly
 * like production, req.cookies is undefined and every cookie-based
 * refresh-token test fails for reasons unrelated to the code under test.
 * The previous health-only e2e spec never needed cookies, helmet, or the
 * ValidationPipe, so it never had to bootstrap this precisely — every spec
 * added after health.e2e-spec.ts does.
 *
 * ITurnstileVerifier and ISnakeCaptchaVerifier are both overridden with
 * deterministic stubs — the real implementations either call out to
 * Cloudflare over the network or expect a real played-out snake-game
 * challenge/verify round trip, neither of which has a place in an offline
 * test suite. SpotifyService is intentionally left un-overridden: with no
 * SPOTIFY_* env vars set (see .env.test), SpotifyService.getAccessToken()
 * already fails-silent with zero network calls, so spotify.e2e-spec.ts
 * exercises the real controller/query/service wiring for free.
 */

import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { json } from 'express'
import helmet from 'helmet'
import type { Server } from 'http'

import { AppModule } from '../../src/app.module'
import { ValidationError } from '../../src/domain/errors/ValidationError'
import { StubTurnstileVerifier } from './stub-turnstile-verifier'
import { StubSnakeCaptchaVerifier } from './stub-snake-captcha-verifier'

export async function createTestApp(): Promise<INestApplication<Server>> {
    const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider('ITurnstileVerifier')
        .useValue(new StubTurnstileVerifier())
        .overrideProvider('ISnakeCaptchaVerifier')
        .useValue(new StubSnakeCaptchaVerifier())
        .compile()

    const app = moduleFixture.createNestApplication<NestExpressApplication>()

    // Mirrors main.ts exactly, minus HTTPS/Swagger/app.listen() — none of
    // which matter for supertest, which talks to the app in-process.
    app.use(helmet())
    app.use(json({ limit: '256kb' }))
    app.use(cookieParser(process.env.COOKIE_SECRET))
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
            stopAtFirstError: true,
            validationError: { target: false, value: false },
            exceptionFactory: (errors) => {
                const messages = errors.map(
                    (err) => `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`,
                )
                return new ValidationError(messages.join('; '))
            },
        }),
    )

    await app.init()

    return app
}
