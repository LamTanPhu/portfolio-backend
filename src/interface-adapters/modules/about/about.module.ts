/**
 * @fileoverview AboutModule
 *
 * Aggregates all public "About Me" related data:
 * Skills, Certifications, Education, Jobs, and Social Accounts.
 *
 * All endpoints are public — no authentication required.
 *
 * KNOWN DUPLICATION (deliberate, not an oversight):
 * These GET routes overlap with the public GET routes on EducationModule,
 * JobModule, CertificationModule, SocialModule, and SkillModule — e.g.
 * `/api/about/education` and `/api/education` both return education data.
 * Each side declares its own Prisma repository binding and Query instance
 * rather than importing/reusing the other's.
 *
 * This is safe to leave as-is: every instance of a given Query class uses
 * the same hardcoded cache key string against the same shared in-memory
 * cache, so both route surfaces always return identical, consistently-
 * cached data — there is no correctness gap, only duplicated wiring.
 *
 * Consolidating (AboutModule importing and reusing the 5 resource modules'
 * exported providers instead of declaring its own) is possible and was
 * evaluated, but deliberately not done: it touches imports/exports across
 * 6 modules, and that class of change is exactly what unit tests can't
 * catch (specs bypass real module boot via manual mocks) — a wiring
 * mistake would only surface at `npm run start:dev`. Worth doing with a
 * real dev environment where you can boot the app and hit every route
 * afterward, not blind.
 */

import { Module } from '@nestjs/common'
import { CacheInfrastructureModule } from '../../../infrastructure/cache/cache.module'

import { AboutController } from './about.controller'

// Use Cases
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'

// Repositories (All Read-only)
import { PrismaSkillReadRepository } from '../../../infrastructure/database/repositories/skill/PrismaSkillReadRepository'
import { PrismaEducationReadRepository } from '../../../infrastructure/database/repositories/education/PrismaEducationReadRepository'
import { PrismaJobReadRepository } from '../../../infrastructure/database/repositories/job/PrismaJobReadRepository'
import { PrismaCertificationReadRepository } from '../../../infrastructure/database/repositories/certification/PrismaCertificationReadRepository'
import { PrismaSocialAccountReadRepository } from '../../../infrastructure/database/repositories/social-account/PrismaSocialAccountReadRepository'

@Module({
    imports: [CacheInfrastructureModule],

    controllers: [AboutController],

    providers: [
        // Repositories (Read-only)
        PrismaSkillReadRepository,
        PrismaEducationReadRepository,
        PrismaJobReadRepository,
        PrismaCertificationReadRepository,
        PrismaSocialAccountReadRepository,

        // Ports (Abstractions)
        { provide: 'ISkillReadRepository', useExisting: PrismaSkillReadRepository },
        { provide: 'IEducationReadRepository', useExisting: PrismaEducationReadRepository },
        { provide: 'IJobReadRepository', useExisting: PrismaJobReadRepository },
        { provide: 'ICertificationReadRepository', useExisting: PrismaCertificationReadRepository },
        { provide: 'ISocialAccountReadRepository', useExisting: PrismaSocialAccountReadRepository },

        // Use Cases
        GetPublishedSkillsQuery,
        GetEducationQuery,
        GetJobsQuery,
        GetPublicSocialAccountsQuery,
        GetCertificationsQuery,
    ],
})
export class AboutModule {}
