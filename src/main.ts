import { NestFactory } from '@nestjs/core'
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

    const app = await NestFactory.create(AppModule, { httpsOptions })

    // ─── Middleware ─────────────────────────────────────────────────────
    app.use(compression({ threshold: 1024, level: 6 }))

    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }))

    app.use(json({ limit: '10kb' }))
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