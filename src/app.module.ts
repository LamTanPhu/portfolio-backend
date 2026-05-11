import { CacheModule } from '@nestjs/cache-manager'
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
import { CacheInfrastructureModule } from './infrastructure/cache/cache.module'
import { PrismaRevokedTokenRepository } from './infrastructure/database/repositories/PrismaRevokedTokenRepository'
import { TokenCleanupTask } from './infrastructure/database/tasks/TokenCleanupTask'
// =============================================================================
// Cache
// CacheInvalidationService is provided globally for all mutation commands to use.
// =============================================================================
import { redisStore } from 'cache-manager-redis-yet'
import { CacheInvalidationService } from './infrastructure/cache/CacheInvalidationService'
import { CACHE_TTL } from './infrastructure/cache/cache.constants'
import { CacheQueryService } from './infrastructure/cache/CacheQueryService'

// =============================================================================
// Feature Modules
// AuthModule must be before feature modules — JwtAuthGuard depends on AuthService.
// =============================================================================
import { AboutModule } from './interface-adapters/modules/about/about.module'
import { AnalyticsModule } from './interface-adapters/modules/analytics/analytics.module'
import { AuthModule } from './interface-adapters/modules/auth/auth.module'
import { BlogModule } from './interface-adapters/modules/blog/blog.module'
import { CertificationModule } from './interface-adapters/modules/certification/certification.module'
import { ContactModule } from './interface-adapters/modules/contact/contact.module'
import { EducationModule } from './interface-adapters/modules/education/education.module'
import { JobModule } from './interface-adapters/modules/job/job.module'
import { ProjectModule } from './interface-adapters/modules/project/project.module'
import { SkillModule } from './interface-adapters/modules/skill/skill.module'
import { SocialModule } from './interface-adapters/modules/social/social.module'
import { SpotifyModule } from './interface-adapters/modules/spotify/spotify.module'
import { UserModule } from './interface-adapters/modules/user/user.module'

// =============================================================================
// Global Providers
// =============================================================================
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'

@Module({
    imports: [
        // ─── Config — must be first ───────────────────────────────────────────
        ConfigModule.forRoot({
            isGlobal:    true,
            envFilePath: '.env',
        }),

        // ─── Scheduler ────────────────────────────────────────────────────────
        ScheduleModule.forRoot(),

        // ─── Rate Limiting (Hybrid Protection) ────────────────────────────────
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    name:  'global',
                    ttl:   60_000,
                    limit: 120,
                },
            ],
        }),

        // ─── Cache Management ─────────────────────────────────────────────────
        // Old in-memory cache (commented out for now)
        // CacheModule.register({
        //     isGlobal: true,
        //     ttl: 300_000,
        //     max: 200,
        // }),

        // ─── Redis Cache (New) ────────────────────────────────────────────────
        // Production-ready caching with Redis. Much better performance + persistence.
        // You can switch back to in-memory by commenting this and uncommenting above.
        CacheModule.registerAsync({
            isGlobal: true,

            useFactory: async () => ({
                store: await redisStore({
                    socket: {
                        host: process.env.REDIS_HOST ?? 'localhost',
                        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
                    },

                    // password: process.env.REDIS_PASSWORD,

                    ttl: CACHE_TTL.MEDIUM,
                }),
            }),
        }),

        // ─── JWT ──────────────────────────────────────────────────────────────
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
        PrismaModule,
        CacheInfrastructureModule,
        // ─── Auth — before feature modules ───────────────────────────────────
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
        { provide: APP_GUARD, useClass: ThrottlerGuard },

        // ─── Global Filters ───────────────────────────────────────────────────
        { provide: APP_FILTER, useClass: DomainExceptionFilter },

        // ─── Scheduled Tasks ──────────────────────────────────────────────────
        PrismaRevokedTokenRepository,
        TokenCleanupTask,

        // ─── Cache Invalidation Service ───────────────────────────────────────
        // Centralizes cache key management for all mutation commands.
        // No longer used, since we have Cache infrastructure now
        // CacheInvalidationService,
        // CacheQueryService,
    ],
})
export class AppModule {}