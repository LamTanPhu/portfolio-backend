/**
 * @fileoverview GetContactMessagesQuery Unit Tests
 *
 * Verifies the SHORT cache profile, the cursor+limit-aware cache key
 * (contactListCacheKey), pagination pass-through, and the Date -> ISO
 * mapping. Also locks in the exported key-builder itself, since
 * DeleteContactMessageCommand's invalidation depends on matching it.
 */

import { GetContactMessagesQuery, contactListCacheKey } from './GetContactMessagesQuery'

const repo = {
    findPaginated: jest.fn(),
    findById: jest.fn(),
}

const cacheQuery = {
    getOrSet: jest.fn(),
    getOrSetWithProfile: jest.fn((_key: string, _profile: string, factory: () => Promise<any>) => factory()),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    clear: jest.fn(),
}

const makeMessage = (overrides = {}) => ({
    id: 1,
    name: 'Jane Visitor',
    email: 'jane@visitor.com',
    message: 'Loved your portfolio!',
    ipAddress: '203.0.113.5',
    browserInfo: 'Mozilla/5.0',
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    ...overrides,
})

describe('contactListCacheKey', () => {
    it('defaults to "start" and limit 20 when neither is provided', () => {
        expect(contactListCacheKey()).toBe('contact:list:admin:cursor=start:limit=20')
    })

    it('includes the given cursor and limit', () => {
        expect(contactListCacheKey(15, 50)).toBe('contact:list:admin:cursor=15:limit=50')
    })
})

describe('GetContactMessagesQuery', () => {
    let query: GetContactMessagesQuery

    beforeEach(() => {
        jest.clearAllMocks()
        cacheQuery.getOrSetWithProfile.mockImplementation(
            (_key: string, _profile: string, factory: () => Promise<any>) => factory(),
        )
        repo.findPaginated.mockResolvedValue({ items: [makeMessage()], nextCursor: null, total: 1 })

        query = new GetContactMessagesQuery(repo, cacheQuery)
    })

    it('forwards cursor and limit to the repository unchanged', async () => {
        await query.execute(10, 25)

        expect(repo.findPaginated).toHaveBeenCalledWith(10, 25)
    })

    it('uses the SHORT cache profile under a key that encodes cursor and limit', async () => {
        await query.execute(10, 25)

        expect(cacheQuery.getOrSetWithProfile).toHaveBeenCalledWith(
            'contact:list:admin:cursor=10:limit=25',
            'SHORT',
            expect.any(Function),
        )
    })

    it('caches different pages under different keys', async () => {
        await query.execute(1, 20)
        await query.execute(2, 20)

        const keys = cacheQuery.getOrSetWithProfile.mock.calls.map((call) => call[0])
        expect(keys).toEqual(['contact:list:admin:cursor=1:limit=20', 'contact:list:admin:cursor=2:limit=20'])
    })

    it('maps messages to ContactMessageDTOs with an ISO createdAt string', async () => {
        const result = await query.execute()

        expect(result.items).toEqual([
            {
                id: 1,
                name: 'Jane Visitor',
                email: 'jane@visitor.com',
                message: 'Loved your portfolio!',
                ipAddress: '203.0.113.5',
                browserInfo: 'Mozilla/5.0',
                createdAt: '2026-02-01T00:00:00.000Z',
            },
        ])
    })

    it('passes nextCursor and total through from the repository page', async () => {
        repo.findPaginated.mockResolvedValue({ items: [], nextCursor: 7, total: 30 })

        const result = await query.execute()

        expect(result.nextCursor).toBe(7)
        expect(result.total).toBe(30)
    })

    it('handles a null browserInfo for submissions with no User-Agent', async () => {
        repo.findPaginated.mockResolvedValue({
            items: [makeMessage({ browserInfo: null })],
            nextCursor: null,
            total: 1,
        })

        const result = await query.execute()

        expect(result.items[0].browserInfo).toBeNull()
    })
})
