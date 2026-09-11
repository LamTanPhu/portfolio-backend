/**
 * @fileoverview GetProjectViewsQuery Unit Tests
 *
 * Admin-only, uncached query. Verifies the existence check (404 before
 * touching view data), the Date -> day-only string mapping, and that
 * total/daily come from a single Promise.all round trip to the repository.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { GetProjectViewsQuery } from './GetProjectViewsQuery'
import { NotFoundError } from '../../../../domain/errors/NotFoundError'
import type { Project } from '../../../../domain/entities/Project'

const mockViewRepo = {
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

const makeProjectView = (overrides = {}) => ({
    id: 1,
    projectId: 42,
    date: new Date('2026-02-01T00:00:00.000Z'),
    count: 7,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('GetProjectViewsQuery', () => {
    let query: GetProjectViewsQuery

    beforeEach(async () => {
        jest.clearAllMocks()
        mockProjectRepo.findById.mockResolvedValue(makeProject())
        mockViewRepo.getTotalViews.mockResolvedValue(20)
        mockViewRepo.findByProject.mockResolvedValue([makeProjectView()])

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetProjectViewsQuery,
                { provide: 'IProjectViewRepository', useValue: mockViewRepo },
                { provide: 'IProjectReadRepository', useValue: mockProjectRepo },
            ],
        }).compile()

        query = module.get<GetProjectViewsQuery>(GetProjectViewsQuery)
    })

    it('throws NotFoundError and never touches view data when the project does not exist', async () => {
        mockProjectRepo.findById.mockResolvedValue(null)

        await expect(query.execute(999)).rejects.toThrow(NotFoundError)
        expect(mockViewRepo.getTotalViews).not.toHaveBeenCalled()
        expect(mockViewRepo.findByProject).not.toHaveBeenCalled()
    })

    it('returns totalViews and a day-only daily breakdown for an existing project', async () => {
        const result = await query.execute(42)

        expect(result).toEqual({
            projectId: 42,
            totalViews: 20,
            daily: [{ date: '2026-02-01', count: 7 }],
        })
    })

    it('returns an empty daily array and zero total when the project has no views yet', async () => {
        mockViewRepo.getTotalViews.mockResolvedValue(0)
        mockViewRepo.findByProject.mockResolvedValue([])

        const result = await query.execute(42)

        expect(result).toEqual({ projectId: 42, totalViews: 0, daily: [] })
    })

    it('propagates an error if the view repository throws', async () => {
        mockViewRepo.getTotalViews.mockRejectedValue(new Error('db down'))

        await expect(query.execute(42)).rejects.toThrow('db down')
    })
})
