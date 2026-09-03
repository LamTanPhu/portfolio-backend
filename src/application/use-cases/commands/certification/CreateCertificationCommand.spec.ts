/**
 * @fileoverview CreateCertificationCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateCertificationCommand } from './CreateCertificationCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicCertifications: jest.fn(),
}

const makeInput = (overrides = {}) => ({
    name: 'AWS Certified Solutions Architect',
    url: 'https://aws.amazon.com/verify/abc123',
    isPublished: true,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2028-01-01'),
    userId: 1,
    ...overrides,
})

const makeCertification = (overrides = {}) => ({
    id: 1,
    name: 'AWS Certified Solutions Architect',
    url: 'https://aws.amazon.com/verify/abc123',
    isPublished: true,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2028-01-01'),
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('CreateCertificationCommand', () => {
    let command: CreateCertificationCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeCertification())
        mockCacheService.invalidatePublicCertifications.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateCertificationCommand,
                { provide: 'ICertificationWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateCertificationCommand>(CreateCertificationCommand)
    })

    it('passes the input straight through to the repository', async () => {
        const input = makeInput()

        await command.execute(input)

        expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('invalidates the public certifications cache after create', async () => {
        await command.execute(makeInput())

        expect(mockCacheService.invalidatePublicCertifications).toHaveBeenCalledTimes(1)
    })

    it('maps the created entity to a CertificationDTO with ISO date strings', async () => {
        mockRepo.create.mockResolvedValue(
            makeCertification({
                id: 7,
                startDate: new Date('2025-01-01T00:00:00.000Z'),
                endDate: new Date('2028-01-01T00:00:00.000Z'),
            }),
        )

        const result = await command.execute(makeInput())

        expect(result).toEqual({
            id: 7,
            name: 'AWS Certified Solutions Architect',
            url: 'https://aws.amazon.com/verify/abc123',
            startDate: '2025-01-01T00:00:00.000Z',
            endDate: '2028-01-01T00:00:00.000Z',
        })
    })

    it('returns endDate: null for lifetime certifications with no expiry', async () => {
        mockRepo.create.mockResolvedValue(makeCertification({ endDate: null }))

        const result = await command.execute(makeInput({ endDate: null }))

        expect(result.endDate).toBeNull()
    })
})
