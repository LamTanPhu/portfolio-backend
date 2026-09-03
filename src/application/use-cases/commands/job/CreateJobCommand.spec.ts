/**
 * @fileoverview CreateJobCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateJobCommand } from './CreateJobCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicJobs: jest.fn(),
}

const makeInput = (overrides = {}) => ({
    companyName: 'Acme Corp',
    role: 'Senior Backend Engineer',
    startedAt: new Date('2022-01-01'),
    endedAt: null,
    isEnded: false,
    userId: 1,
    ...overrides,
})

const makeJob = (overrides = {}) => ({
    id: 1,
    companyName: 'Acme Corp',
    role: 'Senior Backend Engineer',
    startedAt: new Date('2022-01-01'),
    endedAt: null,
    isEnded: false,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('CreateJobCommand', () => {
    let command: CreateJobCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeJob())
        mockCacheService.invalidatePublicJobs.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateJobCommand,
                { provide: 'IJobWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateJobCommand>(CreateJobCommand)
    })

    it('passes the input straight through to the repository', async () => {
        const input = makeInput()

        await command.execute(input)

        expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('invalidates the public jobs cache after create', async () => {
        await command.execute(makeInput())

        expect(mockCacheService.invalidatePublicJobs).toHaveBeenCalledTimes(1)
    })

    it('maps the created entity to a JobDTO with ISO date strings', async () => {
        mockRepo.create.mockResolvedValue(makeJob({ id: 4, startedAt: new Date('2022-01-01T00:00:00.000Z') }))

        const result = await command.execute(makeInput())

        expect(result).toEqual({
            id: 4,
            companyName: 'Acme Corp',
            role: 'Senior Backend Engineer',
            startedAt: '2022-01-01T00:00:00.000Z',
            endedAt: null,
            isEnded: false,
        })
    })

    it('returns endedAt as an ISO string when the job has already ended', async () => {
        mockRepo.create.mockResolvedValue(makeJob({ endedAt: new Date('2023-12-31T00:00:00.000Z'), isEnded: true }))

        const result = await command.execute(makeInput({ endedAt: new Date('2023-12-31'), isEnded: true }))

        expect(result.endedAt).toBe('2023-12-31T00:00:00.000Z')
        expect(result.isEnded).toBe(true)
    })
})
