/**
 * @fileoverview CreateEducationCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateEducationCommand } from './CreateEducationCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicEducation: jest.fn(),
}

const makeInput = (overrides = {}) => ({
    degreeName: 'B.Sc. Computer Science',
    instituteName: 'State University',
    instituteUrl: 'https://university.edu',
    startedAt: new Date('2018-09-01'),
    endedAt: new Date('2022-06-01'),
    isCompleted: true,
    userId: 1,
    ...overrides,
})

const makeEducation = (overrides = {}) => ({
    id: 1,
    degreeName: 'B.Sc. Computer Science',
    instituteName: 'State University',
    instituteUrl: 'https://university.edu',
    startedAt: new Date('2018-09-01'),
    endedAt: new Date('2022-06-01'),
    isCompleted: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('CreateEducationCommand', () => {
    let command: CreateEducationCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeEducation())
        mockCacheService.invalidatePublicEducation.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateEducationCommand,
                { provide: 'IEducationWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateEducationCommand>(CreateEducationCommand)
    })

    it('passes the input straight through to the repository', async () => {
        const input = makeInput()

        await command.execute(input)

        expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('invalidates the public education cache after create', async () => {
        await command.execute(makeInput())

        expect(mockCacheService.invalidatePublicEducation).toHaveBeenCalledTimes(1)
    })

    it('maps the created entity to an EducationDTO with ISO date strings', async () => {
        mockRepo.create.mockResolvedValue(
            makeEducation({
                id: 3,
                startedAt: new Date('2018-09-01T00:00:00.000Z'),
                endedAt: new Date('2022-06-01T00:00:00.000Z'),
            }),
        )

        const result = await command.execute(makeInput())

        expect(result).toEqual({
            id: 3,
            degreeName: 'B.Sc. Computer Science',
            instituteName: 'State University',
            instituteUrl: 'https://university.edu',
            startedAt: '2018-09-01T00:00:00.000Z',
            endedAt: '2022-06-01T00:00:00.000Z',
            isCompleted: true,
        })
    })

    it('returns endedAt: null when the person is currently enrolled', async () => {
        mockRepo.create.mockResolvedValue(makeEducation({ endedAt: null, isCompleted: false }))

        const result = await command.execute(makeInput({ endedAt: null, isCompleted: false }))

        expect(result.endedAt).toBeNull()
        expect(result.isCompleted).toBe(false)
    })
})
