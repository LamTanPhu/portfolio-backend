import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'

// =============================================================================
// AboutController
// Serves public portfolio data — skills, education, work experience,
// certifications and social accounts.
// All endpoints public — no auth required.
// Data managed via seed script or future admin endpoints.
// =============================================================================
@ApiTags('About')
@Controller('about')
export class AboutController {
    constructor(
        private readonly getSkills:         GetPublishedSkillsQuery,
        private readonly getEducation:      GetEducationQuery,
        private readonly getJobs:           GetJobsQuery,
        private readonly getCertifications: GetCertificationsQuery,
        private readonly getSocialAccounts: GetPublicSocialAccountsQuery,
    ) {}

    @Get('skills')
    @ApiOperation({ summary: 'Get all public skills grouped by category' })
    @ApiResponse({ status: 200, description: 'List of public skills' })
    async skills() {
        return this.getSkills.execute()
    }

    @Get('education')
    @ApiOperation({ summary: 'Get all education records ordered by most recent' })
    @ApiResponse({ status: 200, description: 'List of education records' })
    async education() {
        return this.getEducation.execute()
    }

    @Get('jobs')
    @ApiOperation({ summary: 'Get all work experience ordered by most recent' })
    @ApiResponse({ status: 200, description: 'List of work experience records' })
    async jobs() {
        return this.getJobs.execute()
    }

    @Get('certifications')
    @ApiOperation({ summary: 'Get all published certifications' })
    @ApiResponse({ status: 200, description: 'List of published certifications' })
    async certifications() {
        return this.getCertifications.execute()
    }

    @Get('social')
    @ApiOperation({ summary: 'Get all public social accounts — GitHub, LinkedIn etc.' })
    @ApiResponse({ status: 200, description: 'List of public social accounts' })
    async social() {
        return this.getSocialAccounts.execute()
    }
}