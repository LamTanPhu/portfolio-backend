import { Module } from '@nestjs/common'
import { AboutController } from './about.controller'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'

import { PrismaSkillRepository } from '../../../infrastructure/database/repositories/PrismaSkillRepository'
import { PrismaEducationRepository } from '../../../infrastructure/database/repositories/PrismaEducationRepository'
import { PrismaJobRepository } from '../../../infrastructure/database/repositories/PrismaJobRepository'
import { PrismaCertificationRepository } from '../../../infrastructure/database/repositories/PrismaCertificationRepository'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'

@Module({
    controllers: [AboutController],
    providers: [
        // ─── Repositories ─────────────────────────────────────────────────────
        PrismaSkillRepository,
        PrismaEducationRepository,
        PrismaJobRepository,
        PrismaCertificationRepository,

        // ─── Interface tokens ─────────────────────────────────────────────────
        { provide: 'ISkillReadRepository',         useExisting: PrismaSkillRepository },
        { provide: 'IEducationReadRepository',     useExisting: PrismaEducationRepository },
        { provide: 'IJobReadRepository',           useExisting: PrismaJobRepository },
        { provide: 'ICertificationReadRepository', useExisting: PrismaCertificationRepository },

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
    ],
})
export class AboutModule {}