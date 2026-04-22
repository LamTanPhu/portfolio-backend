import { Module } from '@nestjs/common'
import { AboutController } from './about.controller'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'
import { PrismaSkillRepository } from '../../../infrastructure/database/repositories/PrismaSkillRepository'
import { PrismaEducationRepository } from '../../../infrastructure/database/repositories/PrismaEducationRepository'
import { PrismaJobRepository } from '../../../infrastructure/database/repositories/PrismaJobRepository'
import { PrismaCertificationRepository } from '../../../infrastructure/database/repositories/PrismaCertificationRepository'
import { PrismaSocialAccountRepository } from '../../../infrastructure/database/repositories/PrismaSocialAccountRepository'

// =============================================================================
// AboutModule
// Serves all public portfolio data.
// No AuthModule import — all endpoints are public.
// =============================================================================
@Module({
    controllers: [AboutController],
    providers: [
        // ─── Repositories ─────────────────────────────────────────────────────
        PrismaSkillRepository,
        PrismaEducationRepository,
        PrismaJobRepository,
        PrismaCertificationRepository,
        PrismaSocialAccountRepository,

        // ─── Interface tokens ─────────────────────────────────────────────────
        { provide: 'ISkillReadRepository',          useExisting: PrismaSkillRepository },
        { provide: 'IEducationReadRepository',      useExisting: PrismaEducationRepository },
        { provide: 'IJobReadRepository',            useExisting: PrismaJobRepository },
        { provide: 'ICertificationReadRepository',  useExisting: PrismaCertificationRepository },
        { provide: 'ISocialAccountReadRepository',  useExisting: PrismaSocialAccountRepository },

        // ─── Use cases ────────────────────────────────────────────────────────
        {
        provide:    GetPublishedSkillsQuery,
        useFactory: (repo: PrismaSkillRepository) =>
            new GetPublishedSkillsQuery(repo),
        inject: [PrismaSkillRepository],
        },
        {
        provide:    GetEducationQuery,
        useFactory: (repo: PrismaEducationRepository) =>
            new GetEducationQuery(repo),
        inject: [PrismaEducationRepository],
        },
        {
        provide:    GetJobsQuery,
        useFactory: (repo: PrismaJobRepository) =>
            new GetJobsQuery(repo),
        inject: [PrismaJobRepository],
        },
        {
        provide:    GetCertificationsQuery,
        useFactory: (repo: PrismaCertificationRepository) =>
            new GetCertificationsQuery(repo),
        inject: [PrismaCertificationRepository],
        },
        {
        provide:    GetPublicSocialAccountsQuery,
        useFactory: (repo: PrismaSocialAccountRepository) =>
            new GetPublicSocialAccountsQuery(repo),
        inject: [PrismaSocialAccountRepository],
        },
    ],
})
export class AboutModule {}