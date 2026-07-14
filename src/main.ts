import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { json } from 'express'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import { readFileSync } from 'fs'
import { AppModule } from './app.module'
import { ValidationError } from './domain/errors/ValidationError'

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap')
    const isDev = process.env.NODE_ENV !== 'production'

    // ─── HTTPS Configuration ────────────────────────────────────────────
    // Enabled only when USE_HTTPS=true. In development, plain HTTP is fine.
    // In production behind a reverse proxy (Nginx, Cloudflare), TLS is
    // typically terminated at the proxy — USE_HTTPS=false is correct there too.
    let httpsOptions: { key: Buffer; cert: Buffer } | undefined

    if (process.env.USE_HTTPS === 'true') {
        const keyPath  = process.env.CERT_KEY_PATH  ?? './certificates/key.pem'
        const certPath = process.env.CERT_CERT_PATH ?? './certificates/cert.pem'

        try {
            httpsOptions = {
                key:  readFileSync(keyPath),
                cert: readFileSync(certPath),
            }
            logger.log(`HTTPS enabled — certs loaded from ${keyPath} / ${certPath}`)
        } catch (error) {
            logger.error('USE_HTTPS=true but certificates could not be loaded!', error)
            throw new Error(`HTTPS certificates required. Check CERT_KEY_PATH and CERT_CERT_PATH.`)
        }
    } else {
        logger.log('HTTPS disabled (USE_HTTPS != true) — running plain HTTP')
    }

    const app = await NestFactory.create<NestExpressApplication>(AppModule, { httpsOptions })

    // ─── Reverse-Proxy Trust ────────────────────────────────────────────
    // CRITICAL: Without this, req.ip returns the proxy's IP (127.0.0.1),
    // not the real client IP. This breaks:
    //   - Device fingerprinting in JwtAuthGuard (every token gets same fingerprint)
    //   - IP-based rate limiting via ThrottlerGuard
    //   - IP logging for security audit in DomainExceptionFilter
    //   - Spam IP recording in SubmitContactCommand
    //
    // trust proxy = 1 means: trust exactly one hop of X-Forwarded-For headers.
    // Set to the number of reverse proxies in front of this server:
    //   1 = Nginx/Caddy/Cloudflare only
    //   2 = Cloudflare → Nginx → app
    // Do NOT use `true` — it trusts all proxies and lets clients spoof their IP via a custom X-Forwarded-For header.
    const proxyHops = parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10)
    app.set('trust proxy', proxyHops)

    // ─── Middleware ─────────────────────────────────────────────────────
    app.use(compression({ threshold: 1024, level: 6 }))

    app.use(helmet({
        // Keep Helmet's default CORP of 'same-origin'.
        // 'cross-origin' would allow any site to embed responses from this API,
        // which is unnecessary for a JSON-only backend with no embeddable assets.
        // CORS (configured below) already handles legitimate cross-origin API calls.
    }))

    // BUG FIX: this was '10kb'. CreateBlogDto.content allows up to 50,000
    // characters and CreateProjectDto.description up to 10,000 — both are
    // well past a 10kb request body, so any real blog post or project write
    // was rejected by Express's body parser with a 413 before it ever reached
    // the ValidationPipe. 256kb covers the largest DTO (blog: content 50,000
    // + title 255 + excerpt 300 + ~20 tags) with headroom for JSON escaping
    // and multi-byte UTF-8 (Vietnamese diacritics run up to 3-4 bytes/char in
    // UTF-8 while only counting once against the DTO's character-length
    // validators).
    app.use(json({ limit: '256kb' }))
    app.use(cookieParser(process.env.COOKIE_SECRET))

    // ─── CORS ───────────────────────────────────────────────────────────
    const allowedOrigins = (process.env.FRONTEND_URL ?? 'https://localhost:3000')
        .split(',')
        .map(origin => origin.trim())

    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    })

    // ─── Global Settings ────────────────────────────────────────────────
    // ORDER DEPENDENCY: setGlobalPrefix() MUST come before SwaggerModule.setup().
    // Swagger reads the registered prefix to build correct route paths in the UI.
    // Moving Swagger setup above this line silently breaks all documented routes.
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
            const messages = errors.map(err => 
            `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`
            )
            return new ValidationError(messages.join('; '))
        },
        }),
    )

    // ─── Swagger (Dev Only) ─────────────────────────────────────────────
    if (isDev) {
        const config = new DocumentBuilder()
        .setTitle('Portfolio API')
        .setDescription('Lâm Tấn Phú — Portfolio Backend API')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
        .build()

        const document = SwaggerModule.createDocument(app, config)
        SwaggerModule.setup('api/docs', app, document)
    }

    // ─── Start Server ───────────────────────────────────────────────────
    const port     = parseInt(process.env.PORT ?? '3001', 10)
    const protocol = httpsOptions ? 'https' : 'http'
    await app.listen(port)

    logger.log(`Server running on ${protocol}://localhost:${port}`)

    if (isDev) {
        logger.log(`Swagger UI at ${protocol}://localhost:${port}/api/docs`)
    }
}

bootstrap()