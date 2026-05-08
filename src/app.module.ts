import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

// =============================================================================
// Infrastructure
// PrismaModule is @Global() — imported once here, available everywhere.
// ConfigModule is @Global() — loads .env before any other module initializes.
// =============================================================================
import { PrismaModule } from './infrastructure/database/prisma/prisma.service'
import { PrismaRevokedTokenRepository } from './infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { TokenCleanupTask } from './infrastructure/database/tasks/TokenCleanupTask'
import { CacheModule } from '@nestjs/cache-manager';
// =============================================================================
// Feature Modules
// AuthModule must be before feature modules — JwtAuthGuard depends on AuthService.
// =============================================================================
import { AboutModule } from './interface-adapters/modules/about/about.module'
import { AnalyticsModule } from './interface-adapters/modules/analytics/analytics.module'
import { AuthModule } from './interface-adapters/modules/auth/auth.module'
import { BlogModule } from './interface-adapters/modules/blog/blog.module'
import { ContactModule } from './interface-adapters/modules/contact/contact.module'
import { EducationModule } from './interface-adapters/modules/education/education.module'
import { JobModule } from './interface-adapters/modules/job/job.module'
import { ProjectModule } from './interface-adapters/modules/project/project.module'
import { SkillModule } from './interface-adapters/modules/skill/skill.module'
import { SpotifyModule } from './interface-adapters/modules/spotify/spotify.module'
import { UserModule } from './interface-adapters/modules/user/user.module'
import { CertificationModule } from './interface-adapters/modules/certification/certification.module'
import { SocialModule } from './interface-adapters/modules/social/social.module'

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

        // ─── Rate Limiting (Hybrid Protection) ────────────────────────────────
        // Global throttle: 120 requests per minute — acts as safety net.
        // Specific controllers can override with stricter @Throttle() decorators.
        // This balances protection against abuse while keeping public portfolio
        // accessible (normal users rarely exceed 30-40 req/min).
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    name:  'global',
                    ttl:   60_000,   // 1 minute window
                    limit: 120,      // Global max — generous for portfolio
                },
            ],
        }),

        // ─── Cache Management ──────────────────────────────────────────────────────────────
        // 5 minutes default TTL — balances freshness with performance.
        // Max 100 items — prevents unbounded memory growth.
        CacheModule.register({
            isGlobal: true,
            ttl: 300_000,        // Default 5 minutes
            max: 100,            // Max items in cache
        }),

        // ─── JWT ──────────────────────────────────────────────────────────────
        // Access token: 15 minutes — short window minimizes stolen token damage.
        // issuer + audience claims prevent token reuse across different services.
        // secret validated at startup — missing secret = hard crash, not silent fail.
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
        SkillModule,
        UserModule,
        SocialModule,
        EducationModule,
        JobModule,
        CertificationModule,
    ],
    providers: [
        // ─── Global Guards ────────────────────────────────────────────────────
        // Apply rate limiting to every route by default.
        // Individual routes can override with @Throttle() or @SkipThrottle().
        { provide: APP_GUARD, useClass: ThrottlerGuard },

        // ─── Global Filters ───────────────────────────────────────────────────
        // Map all DomainError subclasses to correct HTTP status codes globally.
        { provide: APP_FILTER, useClass: DomainExceptionFilter },

        // ─── Scheduled Tasks ──────────────────────────────────────────────────
        // PrismaRevokedTokenRepository provided here — TokenCleanupTask depends on it.
        // Infrastructure concern — not inside AuthModule.
        PrismaRevokedTokenRepository,
        TokenCleanupTask,
    ],
})
export class AppModule {}