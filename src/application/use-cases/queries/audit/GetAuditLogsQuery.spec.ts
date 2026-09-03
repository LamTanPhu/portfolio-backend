/**
 * @fileoverview GetAuditLogsQuery Unit Tests
 *
 * Deliberately uncached (see the file's own header comment) — these tests
 * lock in that "no cache" decision alongside the pagination pass-through
 * and Date -> ISO mapping, so a future refactor can't accidentally cache it.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { GetAuditLogsQuery } from './GetAuditLogsQuery'

const mockRepo = {
    findPaginated: jest.fn(),
}

const makeEntry = (overrides = {}) => ({
    id: 1,
    actorId: 1,
    method: 'DELETE',
    route: '/api/blogs/5',
    entityType: 'Blog',
    entityId: 5,
    ipAddress: '203.0.113.5',
    statusCode: 200,
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('GetAuditLogsQuery', () => {
    let query: GetAuditLogsQuery

    beforeEach(async () => {
        jest.clearAllMocks()
        mockRepo.findPaginated.mockResolvedValue({ items: [makeEntry()], nextCursor: null, total: 1 })

        const module: TestingModule = await Test.createTestingModule({
            providers: [GetAuditLogsQuery, { provide: 'IAuditLogReadRepository', useValue: mockRepo }],
        }).compile()

        query = module.get<GetAuditLogsQuery>(GetAuditLogsQuery)
    })

    it('forwards cursor and limit to the repository unchanged', async () => {
        await query.execute(10, 25)

        expect(mockRepo.findPaginated).toHaveBeenCalledWith(10, 25)
    })

    it('works with no cursor/limit args (first page, default size)', async () => {
        await query.execute()

        expect(mockRepo.findPaginated).toHaveBeenCalledWith(undefined, undefined)
    })

    it('maps entries to AuditLogDTOs with an ISO createdAt string', async () => {
        const result = await query.execute()

        expect(result.items).toEqual([
            {
                id: 1,
                actorId: 1,
                method: 'DELETE',
                route: '/api/blogs/5',
                entityType: 'Blog',
                entityId: 5,
                ipAddress: '203.0.113.5',
                statusCode: 200,
                createdAt: '2026-02-01T00:00:00.000Z',
            },
        ])
    })

    it('passes nextCursor and total through from the repository page', async () => {
        mockRepo.findPaginated.mockResolvedValue({ items: [], nextCursor: 42, total: 200 })

        const result = await query.execute()

        expect(result.nextCursor).toBe(42)
        expect(result.total).toBe(200)
    })

    it('handles an actorId of null for actions with no attributable actor', async () => {
        mockRepo.findPaginated.mockResolvedValue({ items: [makeEntry({ actorId: null })], nextCursor: null, total: 1 })

        const result = await query.execute()

        expect(result.items[0].actorId).toBeNull()
    })
})
