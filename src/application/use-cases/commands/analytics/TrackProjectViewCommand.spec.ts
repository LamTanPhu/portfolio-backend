/**
 * @fileoverview TrackProjectViewCommand Unit Tests
 *
 * Verifies the projectId reaches the repository's daily-bucketed increment
 * unchanged for a real project — and, since the existence-check fix, that a
 * nonexistent project id is rejected with a clean NotFoundError before
 * increment() is ever called (previously it would have reached increment()
 * and hit the ProjectView -> Project FK constraint as a raw, unhandled
 * Prisma error instead).
 */

import { Test, TestingModule } from '@nestjs/testing'
import { TrackProjectViewCommand } from './TrackProjectViewCommand'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { Project } from '../../../../domain/entities/Project'

const mockRepo = {
    increment: jest.fn(),
    getTotalViews: jest.fn(),
    findByProject: jest.fn(),
}

const mockProjectRepo = {
    findAll: jest.fn(),
    findPublished: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
}

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 42,
    name: 'Electric Motorcycle Rental',
    description: 'A rental platform',
    slug: 'electric-motorcycle-rental',
    techStack: ['NestJS'],
    repoUrl: null,
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: false,
    userId: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
})

describe('TrackProjectViewCommand', () => {
    let command: TrackProjectViewCommand

    beforeEach(async () => {
        jest.clearAllMocks()
        mockRepo.increment.mockResolvedValue(undefined)
        mockProjectRepo.findById.mockResolvedValue(makeProject())

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TrackProjectViewCommand,
                { provide: 'IProjectViewRepository', useValue: mockRepo },
                { provide: 'IProjectReadRepository', useValue: mockProjectRepo },
            ],
        }).compile()

        command = module.get<TrackProjectViewCommand>(TrackProjectViewCommand)
    })

    it("increments today's view count for the given project id", async () => {
        await command.execute(42)

        expect(mockProjectRepo.findById).toHaveBeenCalledWith(42)
        expect(mockRepo.increment).toHaveBeenCalledWith(42)
        expect(mockRepo.increment).toHaveBeenCalledTimes(1)
    })

    it('does not call getTotalViews or findByProject — write-only command', async () => {
        await command.execute(1)

        expect(mockRepo.getTotalViews).not.toHaveBeenCalled()
        expect(mockRepo.findByProject).not.toHaveBeenCalled()
    })

    it('throws NotFoundError and never increments when the project does not exist', async () => {
        mockProjectRepo.findById.mockResolvedValue(null)

        await expect(command.execute(999)).rejects.toThrow(NotFoundError)
        expect(mockRepo.increment).not.toHaveBeenCalled()
    })

    it('propagates an error if the view repository throws', async () => {
        mockRepo.increment.mockRejectedValue(new Error('db down'))

        await expect(command.execute(1)).rejects.toThrow('db down')
    })
})
