import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { json } from 'express'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

// =============================================================================
// Bootstrap
// Application entry point. Configures security, validation, docs, then starts.
// Order matters — security middleware must be registered before routes.
// =============================================================================
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap')
  const isDev = process.env.NODE_ENV !== 'production'

  const app = await NestFactory.create(AppModule, {
    logger: isDev
      ? ['log', 'debug', 'error', 'warn', 'verbose']
      : ['error', 'warn'],
  })

  // ─── Security Headers ──────────────────────────────────────────────────────
  // Helmet sets 11 HTTP security headers in one call.
  // crossOriginResourcePolicy: cross-origin needed for font/image assets.
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))

  // Limit request body to 10kb — prevents payload flooding / DoS attacks.
  app.use(json({ limit: '10kb' }))

  // Cookie parser — required for reading httpOnly refresh token cookies.
  // Signed cookies use COOKIE_SECRET to prevent tampering.
  app.use(cookieParser(process.env.COOKIE_SECRET))

  // ─── CORS ─────────────────────────────────────────────────────────────────
  // Support multiple allowed origins via comma-separated FRONTEND_URL.
  // Never use wildcard '*' — always whitelist explicitly.
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin — mobile apps, curl, Postman in dev.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`[CORS] Blocked origin: ${origin}`))
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Required for httpOnly cookies to be sent cross-origin.
    credentials: true,
    // Cache preflight for 24 hours — reduces OPTIONS request overhead.
    maxAge: 86_400,
  })

  // ─── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api')

  // ─── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip any properties not in the DTO — prevents mass assignment attacks.
      whitelist: true,
      // Throw 400 if unknown properties are sent.
      forbidNonWhitelisted: true,
      // Auto-transform payloads to DTO class instances.
      transform: true,
      transformOptions: {
        // Converts query param strings to number/boolean automatically.
        enableImplicitConversion: true,
      },
    }),
  )

  // ─── Swagger — Development Only ───────────────────────────────────────────
  // Never expose API docs in production — information disclosure risk.
  if (isDev) {
    const config = new DocumentBuilder()
      .setTitle('Portfolio API')
      .setDescription('Lâm Tấn Phú — Portfolio Backend API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
        'JWT',
      )
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  // ─── Process Safety ───────────────────────────────────────────────────────
  // Catch unhandled async errors — prevents silent crashes.
  // e.g. Spotify API down, external service timeout.
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(`[UnhandledRejection] ${String(reason)}`)
  })

  // Catch synchronous exceptions — always exit cleanly.
  process.on('uncaughtException', (error: Error) => {
    logger.error(`[UncaughtException] ${error.message}`, error.stack)
    process.exit(1)
  })

  // ─── Start ────────────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT ?? '3001', 10)
  await app.listen(port)

  logger.log(`Server running on http://localhost:${port}`)
  if (isDev) {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`)
  }
}

bootstrap()