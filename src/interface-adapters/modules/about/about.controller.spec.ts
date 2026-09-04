/**
 * @fileoverview AboutController Unit Tests
 *
 * All five endpoints are thin pass-throughs to already-tested queries
 * (see their own spec files under application/use-cases/queries). What's
 * verified here is purely the interface-adapter layer's job: each route
 * delegates to the right query with no args, and returns its result
 * unmodified — plus that all five are public (no JwtAuthGuard applied).
 */

import { Test, TestingModule } from '@nestjs/testing'
import { AboutController } from './about.controller'
import { GetPublishedSkillsQuery } from '../../../application/use-cases/queries/skill/GetPublishedSkillsQuery'
import { GetEducationQuery } from '../../../application/use-cases/queries/skill/education/GetEducationQuery'
import { GetJobsQuery } from '../../../application/use-cases/queries/skill/jobs/GetJobsQuery'
import { GetCertificationsQuery } from '../../../application/use-cases/queries/skill/certificate/GetCertificationsQuery'
import { GetPublicSocialAccountsQuery } from '../../../application/use-cases/queries/social/GetPublicSocialAccountsQuery'

const mockGetSkills = { execute: jest.fn() }
const mockGetEducation = { execute: jest.fn() }
const mockGetJobs = { execute: jest.fn() }
const mockGetCertifications = { execute: jest.fn() }
const mockGetSocialAccounts = { execute: jest.fn() }

describe('AboutController', () => {
    let controller: AboutController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AboutController],
            providers: [
                { provide: GetPublishedSkillsQuery, useValue: mockGetSkills },
                { provide: GetEducationQuery, useValue: mockGetEducation },
                { provide: GetJobsQuery, useValue: mockGetJobs },
                { provide: GetCertificationsQuery, useValue: mockGetCertifications },
                { provide: GetPublicSocialAccountsQuery, useValue: mockGetSocialAccounts },
            ],
        }).compile()

        controller = module.get<AboutController>(AboutController)
    })

    it('GET /about/skills delegates to GetPublishedSkillsQuery and returns its result', async () => {
        const skills = [{ id: 1, name: 'TypeScript', imageUrl: null, category: 'backend' }]
        mockGetSkills.execute.mockResolvedValue(skills)

        const result = await controller.skills()

        expect(mockGetSkills.execute).toHaveBeenCalledWith()
        expect(result).toBe(skills)
    })

    it('GET /about/education delegates to GetEducationQuery and returns its result', async () => {
        const education = [{ id: 1, degreeName: 'B.Sc.' }]
        mockGetEducation.execute.mockResolvedValue(education)

        const result = await controller.education()

        expect(mockGetEducation.execute).toHaveBeenCalledWith()
        expect(result).toBe(education)
    })

    it('GET /about/jobs delegates to GetJobsQuery and returns its result', async () => {
        const jobs = [{ id: 1, companyName: 'Acme' }]
        mockGetJobs.execute.mockResolvedValue(jobs)

        const result = await controller.jobs()

        expect(mockGetJobs.execute).toHaveBeenCalledWith()
        expect(result).toBe(jobs)
    })

    it('GET /about/certifications delegates to GetCertificationsQuery and returns its result', async () => {
        const certs = [{ id: 1, name: 'AWS SAA' }]
        mockGetCertifications.execute.mockResolvedValue(certs)

        const result = await controller.certifications()

        expect(mockGetCertifications.execute).toHaveBeenCalledWith()
        expect(result).toBe(certs)
    })

    it('GET /about/social delegates to GetPublicSocialAccountsQuery and returns its result', async () => {
        const accounts = [{ id: 1, name: 'GitHub' }]
        mockGetSocialAccounts.execute.mockResolvedValue(accounts)

        const result = await controller.social()

        expect(mockGetSocialAccounts.execute).toHaveBeenCalledWith()
        expect(result).toBe(accounts)
    })
})
