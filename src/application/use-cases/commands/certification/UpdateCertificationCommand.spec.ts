/**
 * @fileoverview UpdateCertificationCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { UpdateCertificationCommand } from './UpdateCertificationCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    update: jest.fn(),
}

const mockCacheService = {
    invalidatePublicCertifications: jest.fn(),
}

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

describe('UpdateCertificationCommand', () => {
    let command: UpdateCertificationCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.update.mockResolvedValue(makeCertification())
        mockCacheService.invalidatePublicCertifications.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UpdateCertificationCommand,
                { provide: 'ICertificationWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<UpdateCertificationCommand>(UpdateCertificationCommand)
    })

    it('strips id from the payload before calling the repository', async () => {
        await command.execute({ id: 1, name: 'New Name' })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New Name' })
    })

    it('supports partial (PATCH-style) updates with a single field', async () => {
        await command.execute({ id: 1, isPublished: false })

        expect(mockRepo.update).toHaveBeenCalledWith(1, { isPublished: false })
    })

    it('invalidates the public certifications cache after update', async () => {
        await command.execute({ id: 1, name: 'New Name' })

        expect(mockCacheService.invalidatePublicCertifications).toHaveBeenCalledTimes(1)
    })

    it('maps the updated entity to a CertificationDTO with ISO date strings', async () => {
        mockRepo.update.mockResolvedValue(
            makeCertification({
                id: 1,
                name: 'Updated Cert',
                startDate: new Date('2025-06-01T00:00:00.000Z'),
                endDate: null,
            }),
        )

        const result = await command.execute({ id: 1, name: 'Updated Cert' })

        expect(result).toEqual({
            id: 1,
            name: 'Updated Cert',
            url: 'https://aws.amazon.com/verify/abc123',
            startDate: '2025-06-01T00:00:00.000Z',
            endDate: null,
        })
    })

    it('propagates an error if the repository throws (e.g. cert not found)', async () => {
        mockRepo.update.mockRejectedValue(new Error('not found'))

        await expect(command.execute({ id: 999, name: 'x' })).rejects.toThrow('not found')
    })
})
