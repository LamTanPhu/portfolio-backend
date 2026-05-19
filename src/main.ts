import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { json } from 'express'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import { readFileSync } from 'fs'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap')
    const isDev = process.env.NODE_ENV !== 'production'

    // ─── HTTPS Configuration ─────────────────────────────────────────────────
    const certPaths = isDev
        ? {
            key: './certificates/key.pem',
            cert: './certificates/cert.pem',
        }
        : {
            key: process.env.CERT_KEY_PATH!,
            cert: process.env.CERT_CERT_PATH!,
        }

    const httpsOptions = {
        key: readFileSync(certPaths.key),
        cert: readFileSync(certPaths.cert),
    }

    const app = await NestFactory.create(AppModule, {
        httpsOptions,
        logger: isDev
            ? ['log', 'debug', 'error', 'warn', 'verbose']
            : ['error', 'warn'],
    })

    // ─── Middleware ─────────────────────────────────────────────────────────
    app.use(compression({ threshold: 1024, level: 6 }))

    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }))

    app.use(json({ limit: '10kb' }))
    app.use(cookieParser(process.env.COOKIE_SECRET))

    // ─── CORS ───────────────────────────────────────────────────────────────
    const allowedOrigins = (process.env.FRONTEND_URL ?? 'https://localhost:3000,https://localhost:3001')
        .split(',')
        .map(origin => origin.trim())

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true)
            } else {
                callback(new Error(`CORS blocked origin: ${origin}`))
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    })

    // ─── Global Settings ────────────────────────────────────────────────────
    app.setGlobalPrefix('api')

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )

    // ─── Swagger (Dev Only) ─────────────────────────────────────────────────
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

    // ─── Start Server ───────────────────────────────────────────────────────
    const port = parseInt(process.env.PORT ?? '3001', 10)
    await app.listen(port)

    logger.log(`Server running on https://localhost:${port}`)

    if (isDev) {
        logger.log(`Swagger docs at https://localhost:${port}/api/docs`)
    }
}

bootstrap()