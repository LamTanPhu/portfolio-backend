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

    // ─── Force HTTPS Configuration ─────────────────────────────────────
    let httpsOptions

    try {
        httpsOptions = {
        key: readFileSync('./certificates/key.pem'),
        cert: readFileSync('./certificates/cert.pem'),
        }
        logger.log('HTTPS enabled with custom certificates')
    } catch (error) {
        logger.error('Failed to load SSL certificates!', error)
        throw new Error('HTTPS certificates are required. Please check the certificates folder.')
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
    const port = parseInt(process.env.PORT ?? '3001', 10)
    await app.listen(port)

    logger.log(`Server running on https://localhost:${port}`)

    if (isDev) {
        logger.log(`Swagger UI at https://localhost:${port}/api/docs`)
    }
}

bootstrap()