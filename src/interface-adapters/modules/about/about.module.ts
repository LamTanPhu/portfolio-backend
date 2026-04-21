import { Module } from '@nestjs/common'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service'
import { AboutController } from './about.controller'

@Module({
    controllers: [AboutController],
    providers: [
        PrismaService,
        GetPublishedSkillsQuery,
        GetEducationQuery,
        GetJobsQuery,
        GetCertificationsQuery,
    ],
})
export class AboutModule {}