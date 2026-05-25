/**
 * @fileoverview AppModule
 *
 * Root module of the entire application.
 * Acts as the composition root — wires infrastructure and all feature modules together.
 * Follows Clean Architecture principles.
 */

import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

// Infrastructure
import { PrismaModule } from './infrastructure/database/prisma/prisma.module'
import { CacheInfrastructureModule } from './infrastructure/cache/cache.module'

// Feature Modules
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

// Global Providers
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'
import { ConfigValidationService } from './infrastructure/config/config-validation.service'   // ← Added

@Module({
    imports: [
        // ─── Core Configuration ─────────────────────────────────────────────
        ConfigModule.forRoot({ isGlobal: true }),

        // ─── Scheduling ─────────────────────────────────────────────────────
        ScheduleModule.forRoot(),

        // ─── Rate Limiting ──────────────────────────────────────────────────
        ThrottlerModule.forRoot({
            throttlers: [{ name: 'global', ttl: 60_000, limit: 120 }],
        }),

        // ─── Redis Cache ────────────────────────────────────────────────────
        CacheModule.registerAsync({
        isGlobal: true,
        imports: [ConfigModule],
        inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                store: await import('cache-manager-redis-yet').then(({ redisStore }) =>
                    redisStore({
                        socket: {
                        host: configService.get<string>('REDIS_HOST', 'localhost'),
                        port: configService.get<number>('REDIS_PORT', 6379),
                        },
                        ttl: 300,
                    }),
                ),
            }),
        }),

        // ─── JWT Configuration ──────────────────────────────────────────────
        JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: '15m',
                    issuer: 'portfolio-api',
                    audience: 'portfolio-admin',
                },
            }),
        }),

        // ─── Infrastructure ─────────────────────────────────────────────────
        PrismaModule,
        CacheInfrastructureModule,

        // ─── Auth (MUST come before feature modules that depend on it) ───────
        AuthModule,

        // ─── Feature Modules ────────────────────────────────────────────────
        ProjectModule,
        BlogModule,
        SkillModule,
        SocialModule,
        AboutModule,
        ContactModule,
        SpotifyModule,
        AnalyticsModule,
        UserModule,
        EducationModule,
        JobModule,
        CertificationModule,
    ],

    providers: [
        ConfigValidationService,

        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
    ],
})

export class AppModule {
    constructor(private readonly configValidation: ConfigValidationService) {
        this.configValidation.validate()
    }
}