/**
 * @fileoverview AboutModule
 * 
 * Aggregates all public "About Me" related data:
 * Skills, Certifications, Education, Jobs, and Social Accounts.
 * 
 * All endpoints are public — no authentication required.
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
    imports: [
        CacheInfrastructureModule,
    ],

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