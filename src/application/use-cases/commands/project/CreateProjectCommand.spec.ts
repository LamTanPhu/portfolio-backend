/**
 * @fileoverview CreateProjectCommand Unit Tests
 *
 * Repository and cache service are fully mocked — no DB, no Redis.
 *
 * Key behaviors tested:
 * - Slug is generated from name (client never sends slug directly)
 * - Both the public project list and the specific slug cache are invalidated
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CreateProjectCommand } from './CreateProjectCommand'
import { CACHE_INVALIDATION_SERVICE } from '../../../../application/ports/cache.tokens'

const mockRepo = {
    create: jest.fn(),
}

const mockCacheService = {
    invalidatePublicProjects: jest.fn(),
    invalidateProjectBySlug: jest.fn(),
}

const makeInput = (overrides = {}) => ({
    name: 'My Portfolio Backend',
    description: 'A clean-architecture NestJS backend.',
    techStack: ['NestJS', 'Prisma', 'PostgreSQL'],
    repoUrl: 'https://github.com/me/portfolio-backend',
    liveUrl: null,
    thumbnailUrl: null,
    isOpenSource: true,
    isPublished: true,
    userId: 1,
    ...overrides,
})

const makeProject = (overrides = {}) => ({
    id: 1,
    name: 'My Portfolio Backend',
    description: 'A clean-architecture NestJS backend.',
    slug: 'my-portfolio-backend',
    techStack: ['NestJS', 'Prisma', 'PostgreSQL'],
    repoUrl: 'https://github.com/me/portfolio-backend',
    liveUrl: null,
    thumbnailUrl: null,
    isPublished: true,
    isOpenSource: true,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
})

describe('CreateProjectCommand', () => {
    let command: CreateProjectCommand

    beforeEach(async () => {
        jest.clearAllMocks()

        mockRepo.create.mockResolvedValue(makeProject())
        mockCacheService.invalidatePublicProjects.mockResolvedValue(undefined)
        mockCacheService.invalidateProjectBySlug.mockResolvedValue(undefined)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateProjectCommand,
                { provide: 'IProjectWriteRepository', useValue: mockRepo },
                { provide: CACHE_INVALIDATION_SERVICE, useValue: mockCacheService },
            ],
        }).compile()

        command = module.get<CreateProjectCommand>(CreateProjectCommand)
    })

    describe('slug generation', () => {
        it('generates a slug from the name and passes it to the repo', async () => {
            await command.execute(makeInput({ name: 'My Portfolio Backend' }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'my-portfolio-backend' }))
        })

        it('generates a slug for names with special characters', async () => {
            await command.execute(makeInput({ name: 'Cool Project! (v2)' }))

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'cool-project-v2' }))
        })
    })

    describe('cache invalidation', () => {
        it('invalidates the public project list', async () => {
            await command.execute(makeInput())

            expect(mockCacheService.invalidatePublicProjects).toHaveBeenCalledTimes(1)
        })

        it('invalidates the cache for the newly created slug', async () => {
            await command.execute(makeInput({ name: 'Brand New Project' }))

            expect(mockCacheService.invalidateProjectBySlug).toHaveBeenCalledWith('brand-new-project')
        })
    })

    describe('output mapping', () => {
        it('maps the created entity to a ProjectDTO with ISO date strings', async () => {
            mockRepo.create.mockResolvedValue(
                makeProject({
                    id: 9,
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                }),
            )

            const result = await command.execute(makeInput())

            expect(result).toEqual({
                id: 9,
                name: 'My Portfolio Backend',
                description: 'A clean-architecture NestJS backend.',
                slug: 'my-portfolio-backend',
                techStack: ['NestJS', 'Prisma', 'PostgreSQL'],
                repoUrl: 'https://github.com/me/portfolio-backend',
                liveUrl: null,
                thumbnailUrl: null,
                isPublished: true,
                isOpenSource: true,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            })
        })
    })
})
