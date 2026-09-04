/**
 * @fileoverview ProjectController Unit Tests
 *
 * ProjectPresenter is a pure pass-through (see project.presenter.ts) so
 * it's left un-mocked. Unlike Certification/Education/Job, update() here
 * passes repoUrl/liveUrl/thumbnailUrl straight through with no ternary —
 * so explicitly sending null to clear one of these actually works. Verified
 * below as a positive contrast to the sibling controllers' bug.
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { ProjectController } from './project.controller'
import { GetPublishedProjectsQuery } from '../../../application/use-cases/queries/project/GetPublishedProjectsQuery'
import { GetProjectBySlugQuery } from '../../../application/use-cases/queries/project/GetProjectBySlugQuery'
import { CreateProjectCommand } from '../../../application/use-cases/commands/project/CreateProjectCommand'
import { UpdateProjectCommand } from '../../../application/use-cases/commands/project/UpdateProjectCommand'
import { DeleteProjectCommand } from '../../../application/use-cases/commands/project/DeleteProjectCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetPublished = { execute: jest.fn() }
const mockGetBySlug = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

const makeCreateDto = (overrides = {}) => ({
    name: 'My Project',
    description: 'desc',
    techStack: ['NestJS'],
    isOpenSource: true,
    ...overrides,
})

describe('ProjectController', () => {
    let controller: ProjectController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProjectController],
            providers: [
                { provide: GetPublishedProjectsQuery, useValue: mockGetPublished },
                { provide: GetProjectBySlugQuery, useValue: mockGetBySlug },
                { provide: CreateProjectCommand, useValue: mockCreate },
                { provide: UpdateProjectCommand, useValue: mockUpdate },
                { provide: DeleteProjectCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<ProjectController>(ProjectController)
    })

    describe('GET /projects — public', () => {
        it('delegates to GetPublishedProjectsQuery and returns the presented list', async () => {
            mockGetPublished.execute.mockResolvedValue([{ id: 1, name: 'P' }])

            const result = await controller.findAll()

            expect(mockGetPublished.execute).toHaveBeenCalledWith()
            expect(result).toEqual([{ id: 1, name: 'P' }])
        })
    })

    describe('GET /projects/:slug — public', () => {
        it('forwards the slug to GetProjectBySlugQuery', async () => {
            mockGetBySlug.execute.mockResolvedValue({ id: 1, slug: 'my-project' })

            const result = await controller.findBySlug('my-project')

            expect(mockGetBySlug.execute).toHaveBeenCalledWith('my-project')
            expect(result).toEqual({ id: 1, slug: 'my-project' })
        })
    })

    describe('POST /projects — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, ProjectController.prototype.create) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('defaults repoUrl/liveUrl/thumbnailUrl to null and isPublished to false when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(makeCreateDto(), makeAuthenticatedRequest())

            expect(mockCreate.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    repoUrl: null,
                    liveUrl: null,
                    thumbnailUrl: null,
                    isPublished: false,
                }),
            )
        })

        it('takes userId from the JWT payload', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(makeCreateDto(), makeAuthenticatedRequest(23))

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: 23 }))
        })
    })

    describe('PATCH /projects/:id — admin only', () => {
        it('merges the parsed id with the update payload', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { name: 'New Name' })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: 'New Name' }))
        })

        it('correctly passes an explicit null through to clear repoUrl (no ternary bug here)', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { repoUrl: null })

            expect(mockUpdate.execute).toHaveBeenCalledWith(expect.objectContaining({ repoUrl: null }))
        })

        it('leaves fields as undefined (no change) when omitted from the payload', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 1 })

            await controller.update(1, { name: 'New Name' })

            expect(mockUpdate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ liveUrl: undefined, thumbnailUrl: undefined }),
            )
        })
    })

    describe('DELETE /projects/:id — admin only', () => {
        it('forwards the parsed id to DeleteProjectCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })

        it('returns nothing (204 No Content)', async () => {
            const result = await controller.delete(5)

            expect(result).toBeUndefined()
        })
    })
})
