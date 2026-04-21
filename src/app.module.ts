import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { JwtModule } from '@nestjs/jwt'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'

// =============================================================================
// Infrastructure
// PrismaModule is @Global() — imported once here, available everywhere.
// Never import PrismaService directly in feature modules.
// =============================================================================
import { PrismaModule } from './infrastructure/database/prisma/prisma.service'

// =============================================================================
// Feature Modules
// =============================================================================
import { ProjectModule } from './interface-adapters/modules/project/project.module'
import { BlogModule } from './interface-adapters/modules/blog/blog.module'
import { ContactModule } from './interface-adapters/modules/contact/contact.module'
import { AuthModule } from './interface-adapters/modules/auth/auth.module'
import { SpotifyModule } from './interface-adapters/modules/spotify/spotify.module'
import { AnalyticsModule } from './interface-adapters/modules/analytics/analytics.module'
import { AboutModule } from './interface-adapters/modules/about/about.module'

// =============================================================================
// Global Providers
// =============================================================================
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'

@Module({
  imports: [
    // ─── Rate Limiting ──────────────────────────────────────────────────────
    // Two throttle tiers:
    // global — 60 requests per minute (sustained traffic)
    // burst  — 10 requests per 10 seconds (rapid fire prevention)
    // ThrottlerGuard applied globally via APP_GUARD below.
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'global', ttl: 60_000, limit: 60 },
        { name: 'burst',  ttl: 10_000, limit: 10 },
      ],
    }),

    // ─── JWT ────────────────────────────────────────────────────────────────
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
        issuer: 'portfolio-api',
        audience: 'portfolio-admin',
      },
      verifyOptions: {
        issuer: 'portfolio-api',
        audience: 'portfolio-admin',
      },
      global: true,
    }),

    // ─── Infrastructure ─────────────────────────────────────────────────────
    // Must be before feature modules — they depend on PrismaService.
    PrismaModule,

    // ─── Features ───────────────────────────────────────────────────────────
    ProjectModule,
    BlogModule,
    ContactModule,
    AuthModule,
    SpotifyModule,
    AnalyticsModule,
    AboutModule,
  ],
  providers: [
    // Apply rate limiting to every route by default.
    // Individual routes can override with @Throttle() or @SkipThrottle().
    { provide: APP_GUARD,  useClass: ThrottlerGuard },

    // Map all DomainError subclasses to correct HTTP status codes globally.
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}