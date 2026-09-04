/**
 * @fileoverview BlogController Unit Tests
 *
 * BlogPresenter is a pure pass-through (see blog.presenter.ts) so it's left
 * un-mocked — these tests verify the controller wires each route to the
 * right use-case with the right arguments, applies its own defaulting
 * logic (excerpt/tags/isPublished, userId from the JWT payload), and that
 * every admin route actually carries JwtAuthGuard.
 */

import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { BlogController } from './blog.controller'
import { GetPublishedBlogsQuery } from '../../../application/use-cases/queries/blog/GetPublishedBlogsQuery'
import { GetAllBlogsQuery } from '../../../application/use-cases/queries/blog/GetAllBlogsQuery'
import { GetBlogBySlugQuery } from '../../../application/use-cases/queries/blog/GetBlogBySlugQuery'
import { SearchBlogsQuery } from '../../../application/use-cases/queries/blog/SearchBlogsQuery'
import { CreateBlogCommand } from '../../../application/use-cases/commands/blog/CreateBlogCommand'
import { UpdateBlogCommand } from '../../../application/use-cases/commands/blog/UpdateBlogCommand'
import { DeleteBlogCommand } from '../../../application/use-cases/commands/blog/DeleteBlogCommand'
import { JwtAuthGuard } from '../../guards/JwtAuthGuard'
import type { AuthenticatedRequest } from '../../guards/JwtAuthGuard'

const mockGetPublished = { execute: jest.fn() }
const mockGetAll = { execute: jest.fn() }
const mockGetBySlug = { execute: jest.fn() }
const mockSearch = { execute: jest.fn() }
const mockCreate = { execute: jest.fn() }
const mockUpdate = { execute: jest.fn() }
const mockDelete = { execute: jest.fn() }

const makeAuthenticatedRequest = (userId = 1) =>
    ({ user: { sub: userId, jti: 'x', iss: 'x', aud: 'x' } }) as AuthenticatedRequest

describe('BlogController', () => {
    let controller: BlogController

    beforeEach(async () => {
        jest.clearAllMocks()

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BlogController],
            providers: [
                { provide: GetPublishedBlogsQuery, useValue: mockGetPublished },
                { provide: GetAllBlogsQuery, useValue: mockGetAll },
                { provide: GetBlogBySlugQuery, useValue: mockGetBySlug },
                { provide: SearchBlogsQuery, useValue: mockSearch },
                { provide: CreateBlogCommand, useValue: mockCreate },
                { provide: UpdateBlogCommand, useValue: mockUpdate },
                { provide: DeleteBlogCommand, useValue: mockDelete },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: jest.fn(() => true) })
            .compile()

        controller = module.get<BlogController>(BlogController)
    })

    describe('GET /blogs — public', () => {
        it('delegates to GetPublishedBlogsQuery and returns the presented list', async () => {
            mockGetPublished.execute.mockResolvedValue([{ id: 1, title: 'Post', slug: 'post' }])

            const result = await controller.findAll()

            expect(mockGetPublished.execute).toHaveBeenCalledWith()
            expect(result).toEqual([{ id: 1, title: 'Post', slug: 'post' }])
        })
    })

    describe('GET /blogs/admin', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, BlogController.prototype.findAllAdmin) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('delegates to GetAllBlogsQuery, including drafts', async () => {
            mockGetAll.execute.mockResolvedValue([{ id: 1, title: 'Draft', slug: 'draft', isPublished: false }])

            const result = await controller.findAllAdmin()

            expect(mockGetAll.execute).toHaveBeenCalledWith()
            expect(result).toEqual([{ id: 1, title: 'Draft', slug: 'draft', isPublished: false }])
        })
    })

    describe('GET /blogs/search — public', () => {
        it('forwards the q query param to SearchBlogsQuery', async () => {
            mockSearch.execute.mockResolvedValue([])

            await controller.search({ q: 'clean architecture' })

            expect(mockSearch.execute).toHaveBeenCalledWith('clean architecture')
        })
    })

    describe('GET /blogs/:slug — public', () => {
        it('forwards the slug param to GetBlogBySlugQuery', async () => {
            const detail = { id: 1, title: 'Post', slug: 'post', content: 'body' }
            mockGetBySlug.execute.mockResolvedValue(detail)

            const result = await controller.findBySlug('post')

            expect(mockGetBySlug.execute).toHaveBeenCalledWith('post')
            expect(result).toEqual(detail)
        })
    })

    describe('POST /blogs — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, BlogController.prototype.create) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('takes userId from the JWT payload, never from the request body', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create({ title: 'T', content: 'C' }, makeAuthenticatedRequest(42))

            expect(mockCreate.execute).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }))
        })

        it('defaults excerpt to null, tags to [], and isPublished to false when omitted', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create({ title: 'T', content: 'C' }, makeAuthenticatedRequest())

            expect(mockCreate.execute).toHaveBeenCalledWith({
                title: 'T',
                content: 'C',
                excerpt: null,
                tags: [],
                isPublished: false,
                userId: 1,
            })
        })

        it('passes through explicit excerpt, tags, and isPublished when provided', async () => {
            mockCreate.execute.mockResolvedValue({ id: 1 })

            await controller.create(
                { title: 'T', content: 'C', excerpt: 'e', tags: ['a', 'b'], isPublished: true },
                makeAuthenticatedRequest(),
            )

            expect(mockCreate.execute).toHaveBeenCalledWith(
                expect.objectContaining({ excerpt: 'e', tags: ['a', 'b'], isPublished: true }),
            )
        })
    })

    describe('PATCH /blogs/:id — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, BlogController.prototype.update) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('merges the parsed id with the update payload', async () => {
            mockUpdate.execute.mockResolvedValue({ id: 5, title: 'New Title' })

            await controller.update(5, { title: 'New Title' })

            expect(mockUpdate.execute).toHaveBeenCalledWith({ id: 5, title: 'New Title' })
        })
    })

    describe('DELETE /blogs/:id — admin only', () => {
        it('is protected by JwtAuthGuard', () => {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading Nest's route-guard metadata off the unbound method reference is intentional
            const guards = Reflect.getMetadata(GUARDS_METADATA, BlogController.prototype.delete) as
                | unknown[]
                | undefined

            expect(guards).toContain(JwtAuthGuard)
        })

        it('forwards the parsed id to DeleteBlogCommand', async () => {
            await controller.delete(5)

            expect(mockDelete.execute).toHaveBeenCalledWith(5)
        })

        it('returns nothing (204 No Content)', async () => {
            const result = await controller.delete(5)

            expect(result).toBeUndefined()
        })
    })
})
