/**
 * @fileoverview AppModule - Root module of the application
 * 
 * This is the main composition root of the application.
 * It wires together all infrastructure, feature modules, and global providers
 * following Clean Architecture principles.
 */

import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

// Infrastructure
import { PrismaModule } from './infrastructure/database/prisma/prisma.service'
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

// Cache
import { redisStore } from 'cache-manager-redis-yet'
import { CACHE_TTL } from './infrastructure/cache/cache.constants'

@Module({
    imports: [
    // ─── Core Configuration ─────────────────────────────────────────────
    ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
        validate: (config) => {
            if (!config.JWT_SECRET) {
                throw new Error('JWT_SECRET environment variable is required')
            }
            return config
        },
    }),

    // ─── Scheduling ─────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Rate Limiting ──────────────────────────────────────────────────
    ThrottlerModule.forRoot({
        throttlers: [
            {
                name: 'global',
                ttl: 60_000,     // 1 minute
                limit: 120,
            },
        ],
    }),

    // ─── Redis Cache (Production Ready) ─────────────────────────────────
    CacheModule.registerAsync({
        isGlobal: true,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
            store: await redisStore({
                socket: {
                    host: configService.get<string>('REDIS_HOST', 'localhost'),
                    port: configService.get<number>('REDIS_PORT', 6379),
                },
                // password: configService.get<string>('REDIS_PASSWORD'),
                ttl: CACHE_TTL.MEDIUM.fresh, // Default TTL
            }),
        }),
    }),

    // ─── JWT Authentication ─────────────────────────────────────────────
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
            verifyOptions: {
                issuer: 'portfolio-api',
                audience: 'portfolio-admin',
            },
            global: true,
        }),
    }),

    // ─── Infrastructure ─────────────────────────────────────────────────
    PrismaModule,
    CacheInfrastructureModule,

    // ─── Auth Module (must come before feature modules that depend on it) ─
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
    // Global Guards
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global Exception Filter
    { provide: APP_FILTER, useClass: DomainExceptionFilter },

    // Scheduled Tasks (uncomment when ready)
    // TokenCleanupTask,
  ],
})
export class AppModule {}