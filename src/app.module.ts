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
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

// Infrastructure
import { buildCacheStores } from './infrastructure/cache/cache-store.factory'
import { CacheInfrastructureModule } from './infrastructure/cache/cache.module'
import { PrismaModule } from './infrastructure/database/prisma/prisma.module'

// Feature Modules
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AboutModule } from './interface-adapters/modules/about/about.module'
import { AnalyticsModule } from './interface-adapters/modules/analytics/analytics.module'
import { AuditModule } from './interface-adapters/modules/audit/audit.module'
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
import { ConfigValidationService } from './infrastructure/config/config-validation.service'
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'
import { AuditLogInterceptor } from './interface-adapters/interceptors/AuditLogInterceptor'
import { TokenCleanupTask } from './infrastructure/database/tasks/TokenCleanupTask'
import { DataRetentionTask } from './infrastructure/database/tasks/DataRetentionTask'

@Module({
    imports: [
        // ─── Core Configuration ─────────────────────────────────────────────
        ConfigModule.forRoot({ isGlobal: true }),

        // ─── Scheduling ─────────────────────────────────────────────────────
        ScheduleModule.forRoot(),

        // ─── Rate Limiting ──────────────────────────────────────────────────
        ThrottlerModule.forRoot({
            throttlers: [
                { name: 'per-ip', ttl: 60_000, limit: 100 },
            ],
        }),

        // ─── Cache (in-memory, or Redis-primary + in-memory-fallback) ─────────
        // REDIS_URL unset → pure in-memory Keyv, identical to before.
        // REDIS_URL set   → Redis primary, in-memory fallback. cache-manager
        //   v7's native multi-store already isolates one store's failure from
        //   the other (verified against this exact installed version — see
        //   cache-store.factory.ts for the full reasoning and the error-
        //   listener requirement that makes that isolation actually reach the
        //   process level, not just the library's internal call graph).
        //
        // CacheQueryService implements Stale-While-Revalidate on top of
        // whichever store(s) are active, so SWR benefits apply either way.
        CacheModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                ttl: 300, // 5 min default — overridden per-call by CacheQueryService profiles
                ...buildCacheStores(configService),
            }),
        }),

        // Note: JWT is configured inside AuthModule (its own JwtModule.registerAsync),
        // not here at the root. A root-level registration used to exist too, but
        // nothing outside AuthModule ever injects JwtService — it was dead config
        // duplicating AuthModule's setup, so it was removed.

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
        AuditModule,

        // ─── Event Modules ────────────────────────────────────────────────
        EventEmitterModule.forRoot(),
    ],

    providers: [
        ConfigValidationService,
        TokenCleanupTask,
        DataRetentionTask,
        { provide: APP_GUARD,       useClass: ThrottlerGuard        },
        { provide: APP_FILTER,      useClass: DomainExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor   },
    ],
})
export class AppModule {
    constructor(private readonly configValidation: ConfigValidationService) {
        this.configValidation.validate()
    }
}