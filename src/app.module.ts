/**
 * @fileoverview AppModule
 *
 * Root module of the entire application.
 * Acts as the composition root — wires infrastructure and all feature modules together.
 * Follows Clean Architecture principles.
 */

import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

// Infrastructure
import { CacheInfrastructureModule } from './infrastructure/cache/cache.module'
import { PrismaModule } from './infrastructure/database/prisma/prisma.module'

// Feature Modules
import { EventEmitterModule } from '@nestjs/event-emitter'
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
import { ConfigValidationService } from './infrastructure/config/config-validation.service'
import { DomainExceptionFilter } from './interface-adapters/filters/DomainExceptionFilter'
import { TokenCleanupTask } from './infrastructure/database/tasks/TokenCleanupTask'

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

        // ─── In-Memory Cache ─────────────────────────────────────────────────
        // Uses cache-manager's built-in Keyv memory store — no Redis required.
        //
        // Why this is fine for a portfolio backend:
        //   - All TTLs are short (10 s – 24 h). A process restart clears the
        //     cache, costing one cold DB hit per key — not data loss.
        //   - Single-instance deployment: no need for a shared cache layer.
        //   - Zero infrastructure cost and zero operational overhead.
        //
        // CacheQueryService implements Stale-While-Revalidate on top of this,
        // so the in-memory store still gets all the SWR benefits.
        //
        // To restore Redis later (multi-instance deploy, persistent cache):
        //   1. npm install cache-manager-redis-yet redis
        //   2. Swap this block for CacheModule.registerAsync + redisStore
        //      (see git history for the exact previous config).
        CacheModule.register({
            isGlobal: true,
            ttl: 300, // 5 min default — overridden per-call by CacheQueryService profiles
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

        // ─── Event Modules ────────────────────────────────────────────────
        EventEmitterModule.forRoot(),
    ],

    providers: [
        ConfigValidationService,
        TokenCleanupTask,
        { provide: APP_GUARD,  useClass: ThrottlerGuard        },
        { provide: APP_FILTER, useClass: DomainExceptionFilter },
    ],
})
export class AppModule {
    constructor(private readonly configValidation: ConfigValidationService) {
        this.configValidation.validate()
    }
}