import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'

// =============================================================================
// Infrastructure
// PrismaModule is @Global() — imported once here, available everywhere.
// ConfigModule is @Global() — loads .env before any other module initializes.
// =============================================================================
import { PrismaModule } from './infrastructure/database/prisma/prisma.service'
import { PrismaRevokedTokenRepository } from './infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { TokenCleanupTask } from './infrastructure/database/tasks/TokenCleanupTask'

// =============================================================================
// Feature Modules
// AuthModule must be before feature modules — JwtAuthGuard depends on AuthService.
// =============================================================================
import { AuthModule } from './interface-adapters/modules/auth/auth.module'
import { ProjectModule } from './interface-adapters/modules/project/project.module'
import { BlogModule } from './interface-adapters/modules/blog/blog.module'
import { ContactModule } from './interface-adapters/modules/contact/contact.module'
import { SpotifyModule } from './interface-adapters/modules/spotify/spotify.module'
import { AnalyticsModule } from './interface-adapters/modules/analytics/analytics.module'
import { AboutModule } from './interface-adapters/modules/about/about.module'

// =============================================================================
// Global Providers
// =============================================================================
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'

@Module({
  imports: [
    // ─── Config — must be first ───────────────────────────────────────────
    // Loads .env before any module initializes — prevents DATABASE_URL errors.
    // isGlobal: true — available in every module without re-importing.
    ConfigModule.forRoot({
      isGlobal:    true,
      envFilePath: '.env',
    }),

    // ─── Scheduler ────────────────────────────────────────────────────────
    // Enables @Cron decorators throughout the application.
    // Used by TokenCleanupTask — runs daily at 2am UTC.
    ScheduleModule.forRoot(),

    // ─── Rate Limiting ────────────────────────────────────────────────────
    // Two throttle tiers:
    // global — 60 requests per minute (sustained traffic)
    // burst  — 10 requests per 10 seconds (rapid fire prevention)
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'global', ttl: 60_000, limit: 60 },
        { name: 'burst',  ttl: 10_000, limit: 10 },
      ],
    }),

    // ─── JWT ──────────────────────────────────────────────────────────────
    // Access token: 15 minutes — short window minimizes stolen token damage.
    // issuer + audience claims prevent token reuse across different services.
    // secret validated at startup — missing secret = hard crash, not silent fail.
    // Generate secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    JwtModule.register({
      secret: (() => {
        if (!process.env.JWT_SECRET) {
          throw new Error('[AppModule] JWT_SECRET environment variable is not set')
        }
        return process.env.JWT_SECRET
      })(),
      signOptions: {
        expiresIn: '15m',
        issuer:    'portfolio-api',
        audience:  'portfolio-admin',
      },
      verifyOptions: {
        issuer:   'portfolio-api',
        audience: 'portfolio-admin',
      },
      global: true,
    }),

    // ─── Infrastructure ───────────────────────────────────────────────────
    // Must be before feature modules — they depend on PrismaService.
    PrismaModule,

    // ─── Auth — before feature modules ───────────────────────────────────
    // AuthModule exports AuthService — JwtAuthGuard in feature modules needs it.
    AuthModule,

    // ─── Features ─────────────────────────────────────────────────────────
    ProjectModule,
    BlogModule,
    ContactModule,
    SpotifyModule,
    AnalyticsModule,
    AboutModule,
  ],
  providers: [
    // ─── Global Guards ────────────────────────────────────────────────────
    // Apply rate limiting to every route by default.
    // Individual routes can override with @Throttle() or @SkipThrottle().
    { provide: APP_GUARD,  useClass: ThrottlerGuard },

    // ─── Global Filters ───────────────────────────────────────────────────
    // Map all DomainError subclasses to correct HTTP status codes globally.
    { provide: APP_FILTER, useClass: DomainExceptionFilter },

    // ─── Scheduled Tasks ──────────────────────────────────────────────────
    // PrismaRevokedTokenRepository provided here — TokenCleanupTask depends on it.
    // Infrastructure concern — not inside AuthModule.
    // Runs daily at 2am UTC — deletes expired revoked tokens in batches.
    PrismaRevokedTokenRepository,
    TokenCleanupTask,
  ],
})
export class AppModule {}