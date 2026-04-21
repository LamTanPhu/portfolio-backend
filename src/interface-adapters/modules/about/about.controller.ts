import { Controller, Get } from '@nestjs/common'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'

@Controller('about')
export class AboutController {
    constructor(
        private readonly getSkills: GetPublishedSkillsQuery,
        private readonly getEducation: GetEducationQuery,
        private readonly getJobs: GetJobsQuery,
        private readonly getCertifications: GetCertificationsQuery,
    ) {}

    @Get('skills')
    async skills() {
        return this.getSkills.execute()
    }

    @Get('education')
    async education() {
        return this.getEducation.execute()
    }

    @Get('jobs')
    async jobs() {
        return this.getJobs.execute()
    }

    @Get('certifications')
    async certifications() {
        return this.getCertifications.execute()
    }
}